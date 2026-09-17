import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { hashSenha } from '../utils/auth.js';

const porta = 3102;
const diretorioTeste = await mkdtemp(path.join(tmpdir(), 'imunizamais-'));
const bancoTeste = path.join(diretorioTeste, 'vacinacao-teste.db');
const baseUrl = `http://127.0.0.1:${porta}`;
let servidor;

function proximaDataUtil() {
    const data = new Date();
    data.setDate(data.getDate() + 1);
    while (data.getDay() === 0 || data.getDay() === 6) data.setDate(data.getDate() + 1);
    data.setHours(10, 0, 0, 0);
    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

async function esperarServidor() {
    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
        try {
            const resposta = await fetch(baseUrl);
            if (resposta.ok) return;
        } catch { /* servidor ainda iniciando */ }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Servidor de integração não iniciou.');
}

async function requisicao(rota, { cookie, method = 'GET', body } = {}) {
    const resposta = await fetch(`${baseUrl}${rota}`, {
        method,
        headers: {
            ...(cookie ? { cookie } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const texto = await resposta.text();
    return {
        status: resposta.status,
        dados: texto ? JSON.parse(texto) : null,
        cookie: resposta.headers.get('set-cookie')?.split(';')[0]
    };
}

try {
    servidor = spawn(process.execPath, ['index.js'], {
        cwd: path.resolve('.'),
        env: {
            ...process.env,
            PORT: String(porta),
            DATABASE_PATH: bancoTeste,
            SESSION_SECRET: 'segredo-apenas-para-teste-de-integracao'
        },
        stdio: 'ignore'
    });
    await esperarServidor();

    const db = new Database(bancoTeste);
    const senhaFuncionario = await hashSenha('SenhaFuncionario123');
    db.prepare(`
        INSERT INTO usuarios (nome, email, senhaHash, papel, cidadaoId)
        VALUES (?, ?, ?, 'funcionario', NULL)
    `).run('Funcionário de Teste', 'funcionario@teste.local', senhaFuncionario);
    db.close();

    const loginFuncionario = await requisicao('/auth/login', {
        method: 'POST',
        body: { email: 'funcionario@teste.local', senha: 'SenhaFuncionario123' }
    });
    assert.equal(loginFuncionario.status, 200, 'funcionário deve autenticar');
    const cookieFuncionario = loginFuncionario.cookie;

    const novoCidadao = {
        nome: 'Cidadã de Teste', cpf: '98765432100', telefone: '11988887777',
        email: 'cidada@teste.local', endereco: 'Rua de Teste, 1'
    };
    assert.equal((await requisicao('/cidadaos', { cookie: cookieFuncionario, method: 'POST', body: novoCidadao })).status, 201);

    const criarAcesso = await requisicao('/auth/registrar', {
        method: 'POST',
        body: { nome: novoCidadao.nome, cpf: novoCidadao.cpf, email: 'ACESSO.CIDADA@TESTE.LOCAL', senha: 'SenhaCidada123' }
    });
    assert.equal(criarAcesso.status, 201, 'cidadão deve criar acesso');

    const loginCidada = await requisicao('/auth/login', {
        method: 'POST',
        body: { email: 'acesso.cidada@teste.local', senha: 'SenhaCidada123' }
    });
    assert.equal(loginCidada.status, 200, 'login deve ignorar diferença de maiúsculas no e-mail');
    const cookieCidada = loginCidada.cookie;

    const dataHora = proximaDataUtil();
    const criarAgendamento = await requisicao('/agendamentos', {
        cookie: cookieCidada, method: 'POST', body: { vacinaId: 1, postoId: 1, dataHora }
    });
    assert.equal(criarAgendamento.status, 201, 'cidadão deve criar agendamento');
    const agendamentoId = criarAgendamento.dados.id;

    assert.equal((await requisicao(`/agendamentos/${agendamentoId}`, {
        cookie: cookieFuncionario, method: 'PUT', body: { statusId: 3 }
    })).status, 200, 'funcionário deve cancelar agendamento');
    assert.equal((await requisicao(`/agendamentos/${agendamentoId}`, {
        cookie: cookieFuncionario, method: 'PUT', body: { statusId: 1 }
    })).status, 200, 'reativação deve validar e aceitar horário/dose disponíveis');
    assert.equal((await requisicao(`/agendamentos/${agendamentoId}`, {
        cookie: cookieFuncionario, method: 'PUT', body: { statusId: 2 }
    })).status, 200, 'realização deve baixar estoque e criar histórico');

    const historico = await requisicao('/historico/meu', { cookie: cookieCidada });
    assert.equal(historico.status, 200, 'cidadão deve consultar o próprio histórico');
    assert.equal(historico.dados.length, 1, 'histórico deve conter vacinação realizada');
    assert.equal((await requisicao('/historico/meu', { cookie: cookieFuncionario })).status, 403, 'funcionário não acessa histórico de cidadão');

    const cidadaoId = loginCidada.dados.usuario.cidadaoId;
    assert.equal((await requisicao(`/cidadaos/${cidadaoId}`, {
        cookie: cookieFuncionario, method: 'DELETE'
    })).status, 200, 'inativação deve preservar registro sem exclusão física');
    assert.equal((await requisicao('/auth/login', {
        method: 'POST', body: { email: 'acesso.cidada@teste.local', senha: 'SenhaCidada123' }
    })).status, 401, 'cidadão inativo não pode autenticar');

    console.log('Integração aprovada: login, sessão, agendamento, status, estoque, histórico e inativação.');
} finally {
    if (servidor) servidor.kill();
    await rm(diretorioTeste, { recursive: true, force: true });
}

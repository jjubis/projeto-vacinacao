import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-historico';

const { default: app } = await import('../app.js');
const { default: authModel } = await import('../models/authModel.js');
const { default: historicoService } = await import('../services/historicoService.js');

const usuarios = {
  cidadao: { id: 11, nome: 'Ana', papel: 'cidadao', paciente_id: 101 },
  funcionario: { id: 12, nome: 'Equipe', papel: 'funcionario', paciente_id: null }
};

let servidor;
let baseUrl;
let findByIdOriginal;
let getByPacienteOriginal;
let idsConsultados;

before(async () => {
  findByIdOriginal = authModel.findById;
  getByPacienteOriginal = historicoService.getByPaciente;
  authModel.findById = async id => Object.values(usuarios).find(usuario => usuario.id === Number(id)) || null;
  historicoService.getByPaciente = async pacienteId => {
    idsConsultados.push(Number(pacienteId));
    return [{ id: 1, paciente_id: Number(pacienteId), vacina_nome: 'Vacina de teste' }];
  };
  servidor = app.listen(0);
  await new Promise(resolve => servidor.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  authModel.findById = findByIdOriginal;
  historicoService.getByPaciente = getByPacienteOriginal;
  if (servidor) await new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve()));
});

function token(usuario) {
  return jwt.sign({ id: usuario.id }, process.env.JWT_SECRET);
}

async function requisitarHistorico(accessToken) {
  return fetch(`${baseUrl}/historico/meu-historico`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  });
}

test('consulta do próprio histórico exige autenticação', async () => {
  idsConsultados = [];
  const resposta = await requisitarHistorico();
  assert.equal(resposta.status, 401);
  assert.deepEqual(idsConsultados, []);
});

test('cidadão recebe somente o histórico do paciente associado à conta atual', async () => {
  idsConsultados = [];
  const resposta = await requisitarHistorico(token(usuarios.cidadao));
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.deepEqual(idsConsultados, [101]);
  assert.deepEqual(corpo.data.map(registro => registro.paciente_id), [101]);
});

test('funcionário não acessa a rota exclusiva do cidadão', async () => {
  idsConsultados = [];
  const resposta = await requisitarHistorico(token(usuarios.funcionario));
  assert.equal(resposta.status, 403);
  assert.deepEqual(idsConsultados, []);
});

test('rota de histórico de outro paciente é exclusiva de funcionários', async () => {
  idsConsultados = [];
  const respostaCidadao = await fetch(`${baseUrl}/historico/paciente/202`, {
    headers: { Authorization: `Bearer ${token(usuarios.cidadao)}` }
  });
  assert.equal(respostaCidadao.status, 403);
  assert.deepEqual(idsConsultados, []);

  const respostaFuncionario = await fetch(`${baseUrl}/historico/paciente/202`, {
    headers: { Authorization: `Bearer ${token(usuarios.funcionario)}` }
  });
  assert.equal(respostaFuncionario.status, 200);
  assert.deepEqual(idsConsultados, [202]);
});

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

const { pool } = await import('../config/database.js');
const { default: pacientesService } = await import('../services/pacientesService.js');

const getConnectionOriginal = pool.getConnection;
const queryOriginal = pool.query;
const consultas = [];
const connectionFake = {
  async beginTransaction() {},
  async commit() {},
  async rollback() {},
  release() {},
  async query(sql, params = []) {
    consultas.push({ sql, params });
    if (sql.includes('SELECT id FROM pacientes')) return [[{ id: 101 }], []];
    if (sql.includes('UPDATE usuarios SET ativo = 1')) return [{ affectedRows: 1 }, []];
    if (sql.includes('INSERT INTO auditoria_status_cidadao')) return [{ affectedRows: 1 }, []];
    throw new Error(`Consulta inesperada no teste: ${sql}`);
  }
};

after(() => {
  pool.getConnection = getConnectionOriginal;
  pool.query = queryOriginal;
});

test('reativacao grava o funcionario autenticado como ator da auditoria', async () => {
  consultas.length = 0;
  pool.getConnection = async () => connectionFake;
  pool.query = async () => [[{ id: 101, nome: 'Ana' }], []];

  const paciente = await pacientesService.reactivate(101, 55);
  const evento = consultas.find(consulta => consulta.sql.includes('INSERT INTO auditoria_status_cidadao'));

  assert.equal(paciente.id, 101);
  assert.ok(evento.sql.includes('ator_usuario_id'));
  assert.deepEqual(evento.params, [101, 55]);
});

test('pedido de eliminacao nao apaga dados antes do prazo minimo', async () => {
  const consultasDaConclusao = [];
  const conexaoDeConclusao = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql) {
      consultasDaConclusao.push(sql);
      if (sql.includes('SELECT * FROM solicitacoes_eliminacao_cidadao')) {
        return [[{ id: 8, paciente_id: 101, status: 'aprovada' }], []];
      }
      if (sql.includes('SELECT id FROM pacientes')) return [[{ id: 101 }], []];
      if (sql.includes('DATE_ADD')) return [[{ manter_dados_ate: '2046-01-01', prazo_vigente: 1 }], []];
      throw new Error(`Consulta inesperada no teste: ${sql}`);
    }
  };
  pool.getConnection = async () => conexaoDeConclusao;

  await assert.rejects(
    pacientesService.concluirEliminacao(8, 55),
    error => error.statusCode === 409 && /prazo minimo/.test(error.message)
  );
  assert.equal(consultasDaConclusao.some(sql => sql.startsWith('DELETE FROM')), false);
});

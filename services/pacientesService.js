import { pool } from '../config/database.js';
import { cpfEhValido, emailEhValido, telefoneEhValido } from '../utils/validarDados.js';

const falha = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const normalizarEmail = email => String(email || '').trim().toLowerCase();
const normalizarCpf = cpf => String(cpf || '').replace(/\D/g, '');
const CEPS_ATERRADO = new Set([
  '13801338', '13801340', '13801339', '13801344', '13801345', '13801343', '13801370',
  '13801357', '13801362', '13801335', '13801337', '13801336', '13801358'
]);
const normalizarCep = cep => String(cep || '').replace(/[\s.-]/g, '');
const validarCepAterrado = cep => {
  if (!CEPS_ATERRADO.has(normalizarCep(cep))) {
    throw falha(400, 'Cadastro permitido apenas para residentes do Bairro Aterrado. Por favor, procure a UBS de referência do seu bairro.');
  }
};
const normalizarNome = nome => {
  const particulas = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return String(nome || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ')
    .map((palavra, indice) => indice > 0 && particulas.has(palavra) ? palavra
      : palavra.split(/([-'])/).map(parte => parte === '-' || parte === "'" || !parte
        ? parte : parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1)).join(''))
    .join(' ');
};

function validarDados(data, validarCep = false) {
  const nome = normalizarNome(data.nome);
  const cpf = normalizarCpf(data.cpf);
  const email = normalizarEmail(data.email);
  const telefone = normalizarCpf(data.telefone);
  const cep = normalizarCep(data.cep);

  if (validarCep || Object.hasOwn(data, 'cep')) validarCepAterrado(cep);

  const endereco = montarEndereco(data);
  if (!nome || !cpf || !email || !telefone) {
    throw falha(400, 'Nome, CPF, email e telefone são obrigatórios.');
  }
  if (!cpfEhValido(cpf)) throw falha(400, 'CPF inválido.');
  if (!emailEhValido(email)) throw falha(400, 'Email inválido.');
  if (!telefoneEhValido(telefone)) throw falha(400, 'Telefone inválido.');
  return { ...data, nome, cpf, email, telefone, cep, endereco };
}

const PARTES_ENDERECO = ['logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep'];
function montarEndereco(data) {
  const partes = PARTES_ENDERECO.map(campo => String(data[campo] || '').trim()).filter(Boolean);
  if (partes.length) return partes.join(', ');
  return String(data.endereco || '').trim() || null;
}

const getAll = async () => {
  const [rows] = await pool.query(`SELECT p.* FROM pacientes p
    WHERE NOT EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.paciente_id = p.id AND u.papel = 'cidadao' AND u.ativo = 0
    ) ORDER BY p.nome`);
  return { total: rows.length, pacientes: rows };
};

const getInactive = async () => {
  const [rows] = await pool.query(`SELECT p.*, u.inativado_em
    FROM pacientes p
    INNER JOIN usuarios u ON u.paciente_id = p.id AND u.papel = 'cidadao'
    WHERE u.ativo = 0 ORDER BY u.inativado_em DESC, p.nome`);
  return { total: rows.length, pacientes: rows };
};

const getStatusAudit = async id => {
  const [rows] = await pool.query(
    'SELECT acao, ator_usuario_id, ocorrido_em FROM auditoria_status_cidadao WHERE paciente_id = ? ORDER BY ocorrido_em DESC, id DESC',
    [id]
  );
  return rows;
};

const listarSolicitacoesEliminacao = async () => {
  const [rows] = await pool.query(`
    SELECT s.id, s.paciente_id, s.solicitante_usuario_id, s.status, s.solicitado_em,
      s.manter_dados_ate, s.decisoes, s.decisoes_em, s.decisoes_por,
      p.nome AS paciente_nome, p.cpf,
      DATE(MAX(h.data_aplicacao)) AS ultima_aplicacao,
      DATE_ADD(DATE(MAX(h.data_aplicacao)), INTERVAL 20 YEAR) AS elegivel_em
    FROM solicitacoes_eliminacao_cidadao s
    LEFT JOIN pacientes p ON p.id = s.paciente_id
    LEFT JOIN historico_vacinal h ON h.paciente_id = s.paciente_id
    GROUP BY s.id, p.nome, p.cpf
    ORDER BY s.solicitado_em DESC
  `);
  return rows;
};

const listarSolicitacoesDoCidadao = async pacienteId => {
  const [rows] = await pool.query(
    'SELECT id, status, solicitado_em, manter_dados_ate, decisoes, decisoes_em, concluida_em FROM solicitacoes_eliminacao_cidadao WHERE paciente_id = ? ORDER BY solicitado_em DESC',
    [pacienteId]
  );
  return rows;
};

const solicitarEliminacao = async (pacienteId, usuarioId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [pacientes] = await connection.query('SELECT id FROM pacientes WHERE id = ? FOR UPDATE', [pacienteId]);
    if (!pacientes.length) throw falha(404, 'Cadastro nao encontrado.');
    const [abertas] = await connection.query(
      "SELECT id FROM solicitacoes_eliminacao_cidadao WHERE paciente_id = ? AND status IN ('solicitada', 'aguardando_prazo', 'aprovada') FOR UPDATE",
      [pacienteId]
    );
    if (abertas.length) throw falha(409, 'Ja existe uma solicitacao de eliminacao em andamento.');
    const [[prazo]] = await connection.query(
      'SELECT DATE_ADD(DATE(MAX(data_aplicacao)), INTERVAL 20 YEAR) AS manter_dados_ate, DATE_ADD(DATE(MAX(data_aplicacao)), INTERVAL 20 YEAR) > CURRENT_DATE AS prazo_vigente FROM historico_vacinal WHERE paciente_id = ?',
      [pacienteId]
    );
    const [result] = await connection.query(
      "INSERT INTO solicitacoes_eliminacao_cidadao (paciente_id, solicitante_usuario_id, status, manter_dados_ate) VALUES (?, ?, 'solicitada', ?)",
      [pacienteId, usuarioId, prazo.manter_dados_ate]
    );
    await connection.query(
      "INSERT INTO auditoria_status_cidadao (paciente_id, ator_usuario_id, acao) VALUES (?, ?, 'solicitada_eliminacao')",
      [pacienteId, usuarioId]
    );
    await connection.commit();
    return { id: result.insertId, manter_dados_ate: prazo.manter_dados_ate };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const decidirSolicitacaoEliminacao = async (solicitacaoId, funcionarioId, decisao, justificativa) => {
  if (!['aprovada', 'recusada'].includes(decisao)) throw falha(400, 'Decisao invalida.');
  if (!String(justificativa || '').trim()) throw falha(400, 'Justificativa obrigatoria.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [solicitacoes] = await connection.query(
      'SELECT * FROM solicitacoes_eliminacao_cidadao WHERE id = ? FOR UPDATE', [solicitacaoId]
    );
    const solicitacao = solicitacoes[0];
    if (!solicitacao || !solicitacao.paciente_id) throw falha(404, 'Solicitacao nao encontrada.');
    if (['concluida', 'recusada'].includes(solicitacao.status)) throw falha(409, 'Solicitacao ja encerrada.');

    const [pendentes] = await connection.query(
      "SELECT id FROM agendamentos WHERE paciente_id = ? AND status = 'agendado' LIMIT 1", [solicitacao.paciente_id]
    );
    if (pendentes.length && decisao === 'aprovada') throw falha(409, 'Cancele ou conclua os agendamentos pendentes antes de aprovar.');

    const [[prazo]] = await connection.query(
      'SELECT DATE_ADD(DATE(MAX(data_aplicacao)), INTERVAL 20 YEAR) AS manter_dados_ate, DATE_ADD(DATE(MAX(data_aplicacao)), INTERVAL 20 YEAR) > CURRENT_DATE AS prazo_vigente FROM historico_vacinal WHERE paciente_id = ?',
      [solicitacao.paciente_id]
    );
    if (decisao === 'aprovada' && Number(prazo.prazo_vigente) === 1) {
      await connection.query(
        "UPDATE solicitacoes_eliminacao_cidadao SET status = 'aguardando_prazo', manter_dados_ate = ?, decisoes = ?, decisoes_em = CURRENT_TIMESTAMP, decisoes_por = ? WHERE id = ?",
        [prazo.manter_dados_ate, justificativa.trim(), funcionarioId, solicitacaoId]
      );
      await connection.query(
        "INSERT INTO auditoria_status_cidadao (paciente_id, ator_usuario_id, acao) VALUES (?, ?, 'aguardando_prazo')",
        [solicitacao.paciente_id, funcionarioId]
      );
      await connection.commit();
      return { status: 'aguardando_prazo', manter_dados_ate: prazo.manter_dados_ate };
    }

    await connection.query(
      'UPDATE solicitacoes_eliminacao_cidadao SET status = ?, manter_dados_ate = ?, decisoes = ?, decisoes_em = CURRENT_TIMESTAMP, decisoes_por = ? WHERE id = ?',
      [decisao, prazo.manter_dados_ate, justificativa.trim(), funcionarioId, solicitacaoId]
    );
    await connection.query(
      'INSERT INTO auditoria_status_cidadao (paciente_id, ator_usuario_id, acao) VALUES (?, ?, ?)',
      [solicitacao.paciente_id, funcionarioId, decisao === 'aprovada' ? 'aprovada_eliminacao' : 'recusada_eliminacao']
    );
    await connection.commit();
    return { id: Number(solicitacaoId), status: decisao, manter_dados_ate: prazo.manter_dados_ate };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const concluirEliminacao = async (solicitacaoId, funcionarioId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [solicitacoes] = await connection.query(
      'SELECT * FROM solicitacoes_eliminacao_cidadao WHERE id = ? FOR UPDATE', [solicitacaoId]
    );
    const solicitacao = solicitacoes[0];
    if (!solicitacao || !solicitacao.paciente_id) throw falha(404, 'Solicitacao nao encontrada.');
    if (solicitacao.status !== 'aprovada') throw falha(409, 'A solicitacao precisa estar aprovada.');
    const pacienteId = solicitacao.paciente_id;
    const [pacientes] = await connection.query('SELECT id FROM pacientes WHERE id = ? FOR UPDATE', [pacienteId]);
    if (!pacientes.length) throw falha(404, 'Cadastro nao encontrado.');
    const [[prazo]] = await connection.query(
      'SELECT DATE_ADD(DATE(MAX(data_aplicacao)), INTERVAL 20 YEAR) AS manter_dados_ate, DATE_ADD(DATE(MAX(data_aplicacao)), INTERVAL 20 YEAR) > CURRENT_DATE AS prazo_vigente FROM historico_vacinal WHERE paciente_id = ?',
      [pacienteId]
    );
    if (Number(prazo.prazo_vigente) === 1) {
      throw falha(409, 'O prazo minimo de retencao ainda nao terminou.');
    }
    const [pendentes] = await connection.query(
      "SELECT id FROM agendamentos WHERE paciente_id = ? AND status = 'agendado' LIMIT 1", [pacienteId]
    );
    if (pendentes.length) throw falha(409, 'Existem agendamentos pendentes para este cidadao.');

    const [usuarios] = await connection.query(
      "SELECT id FROM usuarios WHERE paciente_id = ? AND papel = 'cidadao'", [pacienteId]
    );
    for (const usuario of usuarios) {
      await connection.query('DELETE FROM notificacoes WHERE destinatario_id = ?', [usuario.id]);
    }
    await connection.query('DELETE FROM historico_vacinal WHERE paciente_id = ?', [pacienteId]);
    await connection.query('DELETE FROM agendamentos WHERE paciente_id = ?', [pacienteId]);
    await connection.query(
      `UPDATE auditoria_status_cidadao
       SET paciente_id = NULL,
           ator_usuario_id = CASE WHEN ator_usuario_id IN (
             SELECT id FROM usuarios WHERE paciente_id = ? AND papel = 'cidadao'
           ) THEN NULL ELSE ator_usuario_id END
       WHERE paciente_id = ?`,
      [pacienteId, pacienteId]
    );
    await connection.query('DELETE FROM usuarios WHERE paciente_id = ? AND papel = \'cidadao\'', [pacienteId]);
    await connection.query('DELETE FROM pacientes WHERE id = ?', [pacienteId]);
    await connection.query(
      "UPDATE solicitacoes_eliminacao_cidadao SET paciente_id = NULL, solicitante_usuario_id = NULL, status = 'concluida', decisoes = CONCAT(COALESCE(decisoes, ''), '\\nEliminacao concluida por usuario ', ?), decisoes_em = CURRENT_TIMESTAMP, decisoes_por = ?, concluida_em = CURRENT_TIMESTAMP WHERE id = ?",
      [funcionarioId, funcionarioId, solicitacaoId]
    );
    await connection.query(
      "INSERT INTO auditoria_status_cidadao (paciente_id, ator_usuario_id, acao) VALUES (NULL, ?, 'eliminado')",
      [funcionarioId]
    );
    await connection.commit();
    return { id: Number(solicitacaoId), status: 'concluida' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getById = async id => {
  const [rows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
  return rows[0];
};

const create = async data => {
  const paciente = validarDados(data, true);
  if (!paciente.data_nascimento) throw falha(400, 'Data de nascimento é obrigatória.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existentes] = await connection.query('SELECT id FROM pacientes WHERE cpf = ?', [paciente.cpf]);
    if (existentes.length) throw falha(409, 'Já existe um cidadão cadastrado com este CPF.');

    const [resultado] = await connection.query(
      'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email, endereco) VALUES (?, ?, ?, ?, ?, ?)',
      [paciente.nome, paciente.cpf, paciente.data_nascimento, paciente.telefone, paciente.email, paciente.endereco]
    );
    const pacienteId = resultado.insertId;

    // Marcador não autenticável: o cidadão define a senha no cadastro de acesso.
    await connection.query(
      "INSERT INTO usuarios (nome, cpf, email, senha_hash, papel, paciente_id) VALUES (?, ?, ?, ?, 'cidadao', ?)",
      [paciente.nome, paciente.cpf, paciente.email, 'PENDING_ACTIVATION', pacienteId]
    );

    await connection.commit();
    return getById(pacienteId);
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw falha(409, 'CPF ou email já está vinculado a outra conta.');
    throw error;
  } finally {
    connection.release();
  }
};

const update = async (id, data) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [atual] = await connection.query('SELECT * FROM pacientes WHERE id = ? FOR UPDATE', [id]);
    if (!atual.length) throw falha(404, 'Cidadão não encontrado.');
    const enderecoRecebido = Object.hasOwn(data, 'endereco') || PARTES_ENDERECO.some(campo => Object.hasOwn(data, campo));
    const paciente = validarDados({ ...atual[0], ...data, ...(enderecoRecebido ? {} : { endereco: atual[0].endereco }) });
    const [cpfEmUso] = await connection.query('SELECT id FROM pacientes WHERE cpf = ? AND id <> ?', [paciente.cpf, id]);
    if (cpfEmUso.length) throw falha(409, 'Já existe um cidadão cadastrado com este CPF.');

    await connection.query(
      'UPDATE pacientes SET nome = ?, cpf = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?',
      [paciente.nome, paciente.cpf, paciente.telefone, paciente.email, paciente.endereco, id]
    );
    await connection.query(
      "UPDATE usuarios SET nome = ?, cpf = ?, email = ? WHERE paciente_id = ? AND papel = 'cidadao'",
      [paciente.nome, paciente.cpf, paciente.email, id]
    );
    await connection.commit();
    return getById(id);
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw falha(409, 'CPF ou email já está vinculado a outra conta.');
    throw error;
  } finally {
    connection.release();
  }
};

const inactivate = async (id, funcionarioId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [pacientes] = await connection.query('SELECT id FROM pacientes WHERE id = ? FOR UPDATE', [id]);
    if (!pacientes.length) throw falha(404, 'Cidadao nao encontrado.');
    const [usuarios] = await connection.query(
      "SELECT id, ativo FROM usuarios WHERE paciente_id = ? AND papel = 'cidadao' FOR UPDATE", [id]
    );
    if (!usuarios.length) throw falha(404, 'Conta de cidadao nao encontrada.');
    if (usuarios.some(usuario => Number(usuario.ativo) !== 0)) {
      await connection.query(
        "UPDATE usuarios SET ativo = 0, inativado_em = CURRENT_TIMESTAMP, inativado_por = ? WHERE paciente_id = ? AND papel = 'cidadao'",
        [funcionarioId, id]
      );
      await connection.query(
        "INSERT INTO auditoria_status_cidadao (paciente_id, ator_usuario_id, acao) VALUES (?, ?, 'inativado')",
        [id, funcionarioId]
      );
    }
    await connection.commit();
    return { paciente_id: Number(id), inativado: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const reactivate = async (id, funcionarioId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [pacientes] = await connection.query('SELECT id FROM pacientes WHERE id = ? FOR UPDATE', [id]);
    if (!pacientes.length) throw falha(404, 'Cidadao nao encontrado.');
    const [result] = await connection.query(
      "UPDATE usuarios SET ativo = 1, inativado_em = NULL, inativado_por = NULL WHERE paciente_id = ? AND papel = 'cidadao' AND ativo = 0",
      [id]
    );
    if (!result.affectedRows) throw falha(409, 'Conta ja ativa ou inexistente.');
    await connection.query(
      "INSERT INTO auditoria_status_cidadao (paciente_id, ator_usuario_id, acao) VALUES (?, ?, 'reativado')",
      [id, funcionarioId]
    );
    await connection.commit();
    return getById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export default {
  getAll, getInactive, getStatusAudit, listarSolicitacoesEliminacao, listarSolicitacoesDoCidadao, solicitarEliminacao,
  decidirSolicitacaoEliminacao, concluirEliminacao, getById, create, update, inactivate, reactivate
};

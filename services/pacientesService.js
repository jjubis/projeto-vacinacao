import { pool } from '../config/database.js';
import { cpfEhValido, emailEhValido, telefoneEhValido } from '../utils/validarDados.js';

const falha = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const normalizarEmail = email => String(email || '').trim().toLowerCase();
const normalizarCpf = cpf => String(cpf || '').replace(/\D/g, '');

function validarDados(data) {
  const nome = String(data.nome || '').trim();
  const cpf = normalizarCpf(data.cpf);
  const email = normalizarEmail(data.email);
  const telefone = normalizarCpf(data.telefone);

  if (!nome || !cpf || !email || !telefone || !data.endereco) {
    throw falha(400, 'Nome, CPF, email, telefone e endereço são obrigatórios.');
  }
  if (!cpfEhValido(cpf)) throw falha(400, 'CPF inválido.');
  if (!emailEhValido(email)) throw falha(400, 'Email inválido.');
  if (!telefoneEhValido(telefone)) throw falha(400, 'Telefone inválido.');
  return { ...data, nome, cpf, email, telefone, endereco: String(data.endereco).trim() };
}

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM pacientes ORDER BY nome');
  return { total: rows.length, pacientes: rows };
};

const getById = async id => {
  const [rows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
  return rows[0];
};

const create = async data => {
  const paciente = validarDados(data);
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
    const paciente = validarDados({ ...atual[0], ...data });
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

const remove = async id => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM usuarios WHERE paciente_id = ? AND papel = 'cidadao'", [id]);
    const [result] = await connection.query('DELETE FROM pacientes WHERE id = ?', [id]);
    if (!result.affectedRows) throw falha(404, 'Cidadão não encontrado.');
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export default { getAll, getById, create, update, remove };

import { pool } from "../config/database.js";

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM pacientes ORDER BY nome');
  return {
    total: rows.length,
    pacientes: rows,
  };
};

const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
  return rows[0];
};

const create = async (data) => {
  const { nome, cpf, data_nascimento, telefone, email } = data;

  const [result] = await pool.query(
    'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email) VALUES (?, ?, ?, ?, ?)',
    [nome, cpf, data_nascimento, telefone || null, email || null]
  );

  return getById(result.insertId);
};

const update = async (id, data) => {
  const { nome, cpf, data_nascimento, telefone, email } = data;

  await pool.query(
    'UPDATE pacientes SET nome = ?, cpf = ?, data_nascimento = ?, telefone = ?, email = ? WHERE id = ?',
    [nome, cpf, data_nascimento, telefone || null, email || null, id]
  );

  return getById(id);
};

const remove = async (id) => {
  await pool.query('DELETE FROM pacientes WHERE id = ?', [id]);
};

export default { getAll, getById, create, update, remove };

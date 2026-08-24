import { pool } from "../config/database.js";

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM postos_saude ORDER BY nome');
  return rows;
};

const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM postos_saude WHERE id = ?', [id]);
  return rows[0];
};

const create = async (data) => {
  const { nome, endereco, telefone } = data;

  const [result] = await pool.query(
    'INSERT INTO postos_saude (nome, endereco, telefone) VALUES (?, ?, ?)',
    [nome, endereco || null, telefone || null]
  );

  return getById(result.insertId);
};

const update = async (id, data) => {
  const { nome, endereco, telefone } = data;

  await pool.query(
    'UPDATE postos_saude SET nome = ?, endereco = ?, telefone = ? WHERE id = ?',
    [nome, endereco || null, telefone || null, id]
  );

  return getById(id);
};

const remove = async (id) => {
  await pool.query('DELETE FROM postos_saude WHERE id = ?', [id]);
};

export default { getAll, getById, create, update, remove };

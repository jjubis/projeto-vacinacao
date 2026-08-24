import { pool } from "../config/database.js";

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM vacinas ORDER BY nome');
  return {
    total: rows.length,
    vacinas: rows,
  };
};

const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM vacinas WHERE id = ?', [id]);
  return rows[0];
};

const create = async (data) => {
  const { nome, fabricante, quantidade_estoque, validade, lote, minimo_alerta } = data;

  const [result] = await pool.query(
    'INSERT INTO vacinas (nome, fabricante, quantidade_estoque, validade, lote, minimo_alerta) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, fabricante || null, quantidade_estoque || 0, validade || null, lote || null, minimo_alerta || 0]
  );

  return getById(result.insertId);
};

const update = async (id, data) => {
  const { nome, fabricante, quantidade_estoque, validade, lote, minimo_alerta } = data;

  await pool.query(
    'UPDATE vacinas SET nome = ?, fabricante = ?, quantidade_estoque = ?, validade = ?, lote = ?, minimo_alerta = ? WHERE id = ?',
    [nome, fabricante || null, quantidade_estoque || 0, validade || null, lote || null, minimo_alerta || 0, id]
  );

  return getById(id);
};

const remove = async (id) => {
  await pool.query('DELETE FROM vacinas WHERE id = ?', [id]);
};

export default { getAll, getById, create, update, remove };

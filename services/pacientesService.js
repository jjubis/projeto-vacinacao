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
  // const { nome, cpf, data_nascimento, telefone, email } = data;
  const {
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    cep,
    ...outrosDados
  } = data;

  const complementoTexto = complemento ? `, ${complemento}` : '';
  const enderecoCompleto = `${logradouro}, ${numero}${complementoTexto}, ${bairro}, ${cidade} - ${uf}, ${cep}`;

  console.log('Endereço completo:', enderecoCompleto);

  const [result] = await pool.query(
    'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email, endereco) VALUES (?, ?, ?, ?, ?, ?)',
    [outrosDados.nome, outrosDados.cpf, outrosDados.data_nascimento, outrosDados.telefone || null, outrosDados.email || null, enderecoCompleto]
  );

  return getById(result.insertId);
};

const update = async (id, data) => {
  // const { nome, cpf, data_nascimento, telefone, email } = data;
  const {
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    cep,
    ...outrosDados
  } = data;

  const complementoTexto = complemento ? `, ${complemento}` : '';
  const enderecoCompleto = `${logradouro}, ${numero}${complementoTexto}, ${bairro}, ${cidade} - ${uf}, ${cep}`;

  await pool.query(
    'UPDATE pacientes SET nome = ?, cpf = ?, data_nascimento = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?',
    [outrosDados.nome, outrosDados.cpf, outrosDados.data_nascimento, outrosDados.telefone || null, outrosDados.email || null, enderecoCompleto, id]
  );

  return getById(id);
};

const remove = async (id) => {
  await pool.query('DELETE FROM pacientes WHERE id = ?', [id]);
};

export default { getAll, getById, create, update, remove };

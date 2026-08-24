import { pool } from "../config/database.js";

const SELECT_BASE = `
  SELECT 
    h.id,
    h.paciente_id,
    h.vacina_id,
    h.data_aplicacao,
    h.dose,
    h.profissional_responsavel,
    p.nome AS paciente_nome,
    v.nome AS vacina_nome,
    COALESCE(h.lote, v.lote) AS vacina_lote
  FROM historico_vacinal h
  INNER JOIN pacientes p ON p.id = h.paciente_id
  INNER JOIN vacinas v ON v.id = h.vacina_id
`;

const getAll = async () => {
  console.log("=== EXECUTANDO QUERY DO HISTÓRICO ===");
  console.log("SQL USADA:", `${SELECT_BASE} ORDER BY h.data_aplicacao DESC`);

  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY h.data_aplicacao DESC`);

  console.log("PRIMEIRO REGISTRO RETORNADO:", rows[0]);
  return rows;
};

const getByPaciente = async (pacienteId) => {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE h.paciente_id = ? ORDER BY h.data_aplicacao DESC`,
    [pacienteId]
  );
  return rows;
};

const create = async (data) => {
  const { paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel } = data;

  const [result] = await pool.query(
    'INSERT INTO historico_vacinal (paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel) VALUES (?, ?, ?, ?, ?, ?)',
    [paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel]
  );

  const [rows] = await pool.query(`${SELECT_BASE} WHERE h.id = ?`, [result.insertId]);
  return rows[0];
};

export default { getAll, getByPaciente, create };

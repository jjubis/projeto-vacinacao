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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO historico_vacinal (paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel) VALUES (?, ?, ?, ?, ?, ?)',
      [paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel]
    );
    const [agendamentos] = await connection.query(
      "SELECT id FROM agendamentos WHERE paciente_id = ? AND vacina_id = ? AND status = 'agendado' AND data_agendamento <= ? ORDER BY data_agendamento ASC LIMIT 1 FOR UPDATE",
      [paciente_id, vacina_id, data_aplicacao]
    );
    if (agendamentos.length) {
      await connection.query("UPDATE agendamentos SET status = 'realizado' WHERE id = ?", [agendamentos[0].id]);
    }
    await connection.commit();
    const [rows] = await pool.query(`${SELECT_BASE} WHERE h.id = ?`, [result.insertId]);
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const buscarCarteirinha = async (pacienteId) => {
  const [paciente] = await pool.query(
    "SELECT id, nome, cpf, data_nascimento FROM pacientes WHERE id = ?",
    [pacienteId]
  )

  const [historico] = await pool.query(`
    SELECT h.id, h.data_aplicacao, h.dose, h.lote, h.profissional_responsavel, v.nome AS vacina_nome
    FROM historico_vacinal h
    JOIN vacinas v ON h.vacina_id = v.id
    WHERE h.paciente_id = ?
    ORDER BY h.data_aplicacao DESC
  `, [pacienteId]);

  return {
    paciente: paciente[0] || null,
    historico: historico || []
  };
};

export default { getAll, getByPaciente, create, buscarCarteirinha };

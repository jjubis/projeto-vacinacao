import { pool } from "../config/database.js";
import agendamentoModel from "../models/agendamentoModel.js";

const SELECT_BASE = `
    SELECT
    a.id,
    a.paciente_id,
    a.vacina_id,
    a.posto_id,
    a.data_agendamento,
    a.status,
    p.nome AS paciente_nome,
    v.nome AS vacina_nome,
    ps.nome AS posto_nome
  FROM agendamentos a
  JOIN pacientes p ON p.id = a.paciente_id
  JOIN vacinas v ON v.id = a.vacina_id
  JOIN postos_saude ps ON ps.id = a.posto_id
`

const getAll = async () => {
    const [rows] = await pool.query(`${SELECT_BASE} ORDER BY a.data_agendamento DESC`);
    return rows;
};

const getById = async (id) => {
    const [rows] = await pool.query(`${SELECT_BASE} WHERE a.id = ?`, [id]);
    return rows[0];
};

const create = async (data) => {
    const { paciente_id, vacina_id, posto_id, data_agendamento, status } = data;

    const [result] = await pool.query(
        'INSERT INTO agendamentos (paciente_id, vacina_id, posto_id, data_agendamento, status) VALUES (?, ?, ?, ?, ?)',
        [paciente_id, vacina_id, posto_id, data_agendamento, status || 'agendado']
    );

    return getById(result.insertId);
};

const update = async (id, data) => {
    const { paciente_id, vacina_id, posto_id, data_agendamento, status } = data;

    await pool.query(
        'UPDATE agendamentos SET paciente_id = ?, vacina_id = ?, posto_id = ?, data_agendamento = ?, status = ? WHERE id = ?',
        [paciente_id, vacina_id, posto_id, data_agendamento, status || 'agendado', id]
    );

    return getById(id);
};

const remove = async (id) => {
    await pool.query('DELETE FROM agendamentos WHERE id = ?', [id]);
};

const listarPorPaciente = async (pacienteId) => {
    if (!pacienteId) {
        throw new Error("O ID do paciente é obrigatório para listar agendamentos.");
    }

    const agendamentos = await agendamentoModel.findByCidadao(pacienteId);
    return agendamentos;
};

export default {
    getAll,
    getById,
    create,
    update,
    remove,
    listarPorPaciente
}
import { pool } from "../config/database.js";

export const findByCidadao = async (cidadaoId) => {
    const [rows] = await pool.query(
        `SELECT a.id, a.data_agendamento, a.status, v.nome AS vacina, p.nome AS posto
        FROM agendamentos a
        JOIN vacinas v ON a.vacina_id = v.id
        JOIN postos_saude p ON a.posto_id = p.id
        WHERE a.paciente_id = ?
        ORDER BY a.data_agendamento DESC`,
        [cidadaoId]
    )
    return rows;
}

export default {
    tableName: 'agendamentos',
    columns: ['id', 'data_agendamento', 'status', 'vacina_id', 'posto_id', 'paciente_id'],
    findByCidadao
}
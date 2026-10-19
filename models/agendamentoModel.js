import { pool } from "../config/database.js";

export const buscarAgendamentoPorId = async (agendamentoId) => {
    const [rows] = await pool.query(
        `SELECT a.*
        FROM agendamentos a
        WHERE a.id = ?`,
        [agendamentoId]
    );
    return rows[0];
}

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

export const buscarAgendamentosPendentes = async (postoId, vacinaId, statusAgendamento) => {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS total
        FROM agendamentos
        WHERE posto_id = ?
            AND vacina_id = ?
            AND status = ?`,
        [postoId, vacinaId, statusAgendamento]
    )
    return Number(rows[0]?.total || 0);
}

export const buscarAgendamentosPendentesExcetoId = async (postoId, vacinaId, statusAgendamento, idIgnorado) => {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS total
        FROM agendamentos
        WHERE posto_id = ?
            AND vacina_id = ?
            AND status = ?
            AND id != ?`,
        [postoId, vacinaId, statusAgendamento, idIgnorado]
    )
    return rows[0]?.total || 0;
    // return rows ? rows.total : 0;
}

export const buscarCidadaoPorId = async (cidadaoId) => {
    const [rows] = await pool.query(
        `SELECT id FROM pacientes WHERE id = ?`,
        [cidadaoId]
    );
    return rows[0];
};

export const buscarVacinaPorId = async (vacinaId) => {
    const [rows] = await pool.query(
        `SELECT id FROM vacinas WHERE id = ?`,
        [vacinaId]
    );
    return rows[0];
};

export const buscarPostoPorId = async (postoId) => {
    const [rows] = await pool.query(
        `SELECT id FROM postos_saude WHERE id = ?`,
        [postoId]
    );
    return rows[0];
};

export const buscarEstoque = async (vacinaId) => {
    const [rows] = await pool.query(
        `SELECT quantidade_estoque FROM vacinas WHERE id = ?`,
        [vacinaId]
    );
    return rows[0];
};

export const verificarConflitoHorario = async (postoId, dataHora, statusAgendado) => {
    const [rows] = await pool.query(
        `SELECT id FROM agendamentos
        WHERE posto_id = ? AND data_agendamento = ? AND status = ?`,
        [postoId, dataHora, statusAgendado]
    );
    return rows[0];
};

export const verificarConflitoHorarioExcetoId = async (postoId, dataHora, statusAgendado, idIgnorado) => {
    const [rows] = await pool.query(
        `SELECT id FROM agendamentos
        WHERE posto_id = ? AND data_agendamento = ? AND status = ? AND id != ?`,
        [postoId, dataHora, statusAgendado, idIgnorado]
    );
    return rows[0];
};

export const buscarAgendamentoExistente = async (cidadaoId, vacinaId) => {
    const [rows] = await pool.query(
        `SELECT a.id, a.status
        FROM agendamentos a
        WHERE a.paciente_id = ? AND a.vacina_id = ?`,
        [cidadaoId, vacinaId]
    );
    return rows[0];
};

export const atualizarAgendamentoExistente = async (postoId, statusAgendado, dataHora, id) => {
    const [rows] = await pool.query(
        `UPDATE agendamentos
        SET posto_id = ?, status = ?, data_agendamento = ?
        WHERE id = ?`,
        [postoId, statusAgendado, dataHora, id]
    );
    return rows.affectedRows;
};

export const inserirAgendamento = async (cidadaoId, vacinaId, postoId, statusAgendado, dataHora) => {
    const [rows] = await pool.query(
        `INSERT INTO agendamentos (paciente_id, vacina_id, posto_id, status, data_agendamento)
        VALUES (?, ?, ?, ?, ?)`,
        [cidadaoId, vacinaId, postoId, statusAgendado, dataHora]
    );
    return rows.insertId;
};

export const decrementarEstoque = async (vacinaId) => {
    const [rows] = await pool.query(
        `UPDATE vacinas
    SET quantidade_estoque = quantidade_estoque - 1
        WHERE id = ? AND quantidade_estoque > 0`,
        [vacinaId]
    );
    return rows.affectedRows;
}

export const atualizarStatusAgendamento = async (novoStatus, agendamentoId) => {
    const [rows] = await pool.query(
        `UPDATE agendamentos
        SET status = ?
        WHERE id = ?`,
        [novoStatus, agendamentoId]
    );
    return rows.affectedRows;
}

export default {
    tableName: 'agendamentos',
    columns: ['id', 'data_agendamento', 'status', 'vacina_id', 'posto_id', 'paciente_id'],
    buscarAgendamentoPorId,
    findByCidadao,
    buscarAgendamentosPendentes,
    buscarAgendamentosPendentesExcetoId,
    buscarCidadaoPorId,
    buscarVacinaPorId,
    buscarPostoPorId,
    buscarEstoque,
    verificarConflitoHorario,
    verificarConflitoHorarioExcetoId,
    buscarAgendamentoExistente,
    atualizarAgendamentoExistente,
    inserirAgendamento,
    decrementarEstoque,
    atualizarStatusAgendamento
}

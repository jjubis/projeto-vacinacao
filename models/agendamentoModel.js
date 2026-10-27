import { pool } from "../config/database.js";

export const buscarAgendamentoPorId = async (agendamentoId, db = pool, lock = false) => {
    const [rows] = await db.query(
        `SELECT a.*, DATE_FORMAT(a.data_agendamento, '%Y-%m-%d %H:%i:%s') AS data_agendamento_local
        FROM agendamentos a
        WHERE a.id = ?${lock ? ' FOR UPDATE' : ''}`,
        [agendamentoId]
    );
    return rows[0];
}

export const findByCidadao = async (cidadaoId) => {
    const [rows] = await pool.query(
        `SELECT a.id, DATE_FORMAT(a.data_agendamento, '%Y-%m-%d %H:%i:%s') AS data_agendamento,
            a.status, v.nome AS vacina, p.nome AS posto
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
        `SELECT p.id FROM pacientes p WHERE p.id = ? AND NOT EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.paciente_id = p.id AND u.papel = 'cidadao' AND u.ativo = 0
        )`,
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

export const buscarEstoque = async (vacinaId, db = pool, lock = false) => {
    const [rows] = await db.query(
        `SELECT quantidade_estoque FROM vacinas WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
        [vacinaId]
    );
    return rows[0];
};

export const buscarLoteVacina = async (vacinaId, dataReferencia, db = pool) => {
    const [rows] = await db.query(
        'SELECT lote, (validade < ?) AS vencida FROM vacinas WHERE id = ?',
        [dataReferencia, vacinaId]
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

export const decrementarEstoque = async (vacinaId, db = pool) => {
    const [rows] = await db.query(
        `UPDATE vacinas
    SET quantidade_estoque = quantidade_estoque - 1
        WHERE id = ? AND quantidade_estoque > 0`,
        [vacinaId]
    );
    return rows.affectedRows;
}

export const atualizarStatusAgendamento = async (novoStatus, agendamentoId, db = pool) => {
    const [rows] = await db.query(
        `UPDATE agendamentos
        SET status = ?
        WHERE id = ?`,
        [novoStatus, agendamentoId]
    );
    return rows.affectedRows;
}

export const registrarAplicacao = async (aplicacao, db = pool) => {
    const { paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel } = aplicacao;
    const [result] = await db.query(
        `INSERT INTO historico_vacinal
            (paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [paciente_id, vacina_id, lote, data_aplicacao, dose, profissional_responsavel]
    );
    return result.insertId;
};

export const excluirAgendamento = async (agendamentoId, db = pool) => {
    const [result] = await db.query('DELETE FROM agendamentos WHERE id = ?', [agendamentoId]);
    return result.affectedRows;
};

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
    atualizarStatusAgendamento,
    excluirAgendamento,
    registrarAplicacao,
    buscarLoteVacina
}

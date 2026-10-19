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

const erroDeRegra = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
}

const getAll = async () => {
    const [rows] = await pool.query(`${SELECT_BASE} ORDER BY a.data_agendamento DESC`);
    return rows;
};

const getById = async (id) => {
    const [rows] = await pool.query(`${SELECT_BASE} WHERE a.id = ?`, [id]);
    return rows[0];
};

const create = async (usuario, data) => {
    // const [result] = await pool.query(
    //     'INSERT INTO agendamentos (paciente_id, vacina_id, posto_id, data_agendamento, status) VALUES (?, ?, ?, ?, ?)',
    //     [paciente_id, vacina_id, posto_id, data_agendamento, status || 'agendado']
    // );

    // return getById(result.insertId);

    let { paciente_id, vacina_id, posto_id, data_agendamento } = data;

    if (usuario.papel === 'cidadao') {
        const pacienteAutenticado = usuario.paciente_id || usuario.cidadaoId;
        if (!pacienteAutenticado) {
            throw { status: 400, message: 'Seu usuário não está associado a um cidadão.' }
        }
        paciente_id = pacienteAutenticado;
    }

    if (usuario.papel !== 'cidadao' && usuario.papel !== 'funcionario') {
        throw { status: 403, message: 'Você não tem permissão para criar agendamentos.' };
    }

    if (!paciente_id || !vacina_id || !posto_id || !data_agendamento) {
        throw { status: 400, message: 'Cidadão, vacina, posto e data/hora são obrigatórios.' }
    }

    paciente_id = Number(paciente_id);
    vacina_id = Number(vacina_id);
    posto_id = Number(posto_id);

    if (!Number.isInteger(paciente_id) || !Number.isInteger(vacina_id) || !Number.isInteger(posto_id)) {
        throw { status: 400, message: 'Os IDs informados são inválidos.' };
    }

    if (!await agendamentoModel.buscarCidadaoPorId(paciente_id)) {
        throw { status: 404, message: 'Cidadão não encontrado.' }
    }

    if (!await agendamentoModel.buscarVacinaPorId(vacina_id)) {
        throw { status: 404, message: 'Vacina não encontrada.' };
    }

    if (!await agendamentoModel.buscarPostoPorId(posto_id)) {
        throw { status: 404, message: 'Posto de saúde não encontrado.' };
    }

    const estoque = await agendamentoModel.buscarEstoque(vacina_id);
    if (!estoque) {
        throw { status: 409, message: 'Não existe estoque desta vacina.' }
    }

    const agendamentosPendentes = await agendamentoModel.buscarAgendamentosPendentes(posto_id, vacina_id, 'agendado');
    const dosesDisponiveis = estoque.quantidade_estoque - agendamentosPendentes;

    if (dosesDisponiveis <= 0) {
        throw { status: 409, message: 'Não há doses disponíveis desta vacina para novos agendamentos.' }
    }

    const dataAgendamento = new Date(data_agendamento);
    if (Number.isNaN(dataAgendamento.getTime())) {
        throw { status: 400, message: 'Data e hora do agendamento inválidos.' }
    }

    if (dataAgendamento <= new Date()) {
        throw { status: 400, message: 'O agendamento deve ser realizado para uma data fatura.' }
    }

    const diaDaSemana = dataAgendamento.getDay();
    const hora = dataAgendamento.getHours();
    const minutos = dataAgendamento.getMinutes();

    if (diaDaSemana === 0 || diaDaSemana === 6) {
        throw { status: 400, message: 'A UBS não realiza vacinações aos finais de semana.' }
    }

    if (hora < 8 || hora > 17 || (hora === 17 && minutos > 0)) {
        throw { status: 400, message: 'Os agendamentos devem ser realizados entre 08:00 e 17:00.' }
    }

    // if (agendamentoModel.verificarConflitoHorario(posto_id, data_agendamento, 'agendado')) {
    //     throw { status: 409, message: 'Este horário já está ocupado. Escolha outro horário.' }
    // }

    console.log('Verificando conflito para:', posto_id, data_agendamento, 'agendado');
    const conflito = await agendamentoModel.verificarConflitoHorario(posto_id, data_agendamento, 'agendado');
    console.log('Resultado do conflito:', conflito);
    if (conflito) {
        throw { status: 409, message: 'Este horário já está ocupado. Escolha outro horário.' };
    }

    const agendamentoExistente = await agendamentoModel.buscarAgendamentoExistente(paciente_id, vacina_id);
    if (agendamentoExistente) {
        if (agendamentoExistente.status === 'agendado') {
            throw { status: 409, message: 'Este cidadão já possui um agendamento para esta vacina.' }
        }
        if (agendamentoExistente.status === 'realizado') {
            throw { status: 409, message: 'Esta vacina já foi realizada para este cidadão.' }
        }
        if (agendamentoExistente.status === 'cancelado') {
            await agendamentoModel.atualizarAgendamentoExistente(posto_id, 'agendado', data_agendamento, agendamentoExistente.id);
            return { message: 'Agendamento realizado com sucesso.', id: agendamentoExistente.id };
        }
    }

    const resultado = await agendamentoModel.inserirAgendamento(paciente_id, vacina_id, posto_id, 'agendado', data_agendamento);
    return { mensagem: 'Agendamento realizado com sucesso.', id: resultado };
};

const update = async (agendamentoId, dadosOuStatus) => {
    /**
     * Por parâmentro era passado: id e data
    */

    // const { paciente_id, vacina_id, posto_id, data_agendamento, status } = data;

    // await pool.query(
    //     'UPDATE agendamentos SET paciente_id = ?, vacina_id = ?, posto_id = ?, data_agendamento = ?, status = ? WHERE id = ?',
    //     [paciente_id, vacina_id, posto_id, data_agendamento, status || 'agendado', id]
    // );

    // return getById(id);

    const status = typeof dadosOuStatus === 'object' && dadosOuStatus !== null
        ? dadosOuStatus.status
        : dadosOuStatus;

    const idAgendamento = Number(agendamentoId);
    if (!Number.isInteger(idAgendamento)) {
        throw erroDeRegra(400, 'ID do agendamento inválido.');
    }

    const novoStatus = status;
    if (Number.isInteger(novoStatus)) {
        throw erroDeRegra(400, 'Status inválido.');
    }

    if (!['agendado', 'realizado', 'cancelado'].includes(novoStatus)) {
        throw erroDeRegra(400, 'Status de agendamento inválido.');
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const agendamento = await agendamentoModel.buscarAgendamentoPorId(idAgendamento);

        if (!agendamento) {
            throw erroDeRegra(404, 'Agendamento não encontrado.');
        }

        const statusAtual = agendamento.status;
        const postoId = agendamento.postoId || agendamento.posto_id;
        const vacinaId = agendamento.vacinaId || agendamento.vacina_id;
        const cidadaoId = agendamento.cidadaoId || agendamento.paciente_id;
        const dataHora = agendamento.dataHora || agendamento.data_agendamento;

        if (statusAtual === novoStatus) {
            await connection.rollback();
            connection.release()
            return { mensagem: 'O agendamento já possui este status.' };
        }

        const transicaoPermitida =
            (statusAtual === 'agendado' && ['realizado', 'cancelado'].includes(novoStatus)) ||
            (statusAtual === 'cancelado' && novoStatus === 'agendado');

        if (!transicaoPermitida) {
            throw erroDeRegra(400, 'Transição de status não permitida.')
        }

        if (novoStatus === 'agendado') {
            const dataAgendamento = new Date(dataHora);

            if (Number.isNaN(dataAgendamento.getTime()) || dataAgendamento <= new Date()) {
                throw erroDeRegra(400, 'Não é possível reativar um agendamento com data/hora inválida ou passada.');
            }

            const estoque = await agendamentoModel.buscarEstoque(vacinaId);
            if (!estoque) {
                throw erroDeRegra(409, 'Não existe estoque desta vacina.');
            }

            const pendentes = await agendamentoModel.buscarAgendamentosPendentesExcetoId(postoId, vacinaId, 'agendado', idAgendamento);
            const qtdEstoque = estoque.quantidade !== undefined ? estoque.quantidade : estoque.quantidade_estoque;

            if (qtdEstoque - pendentes <= 0) {
                throw erroDeRegra(409, 'Não há doses disponíveis para reativar este agendamento.');
            }

            const conflitoHorario = await agendamentoModel.verificarConflitoHorarioExcetoId(
                postoId,
                dataHora,
                'agendado',
                idAgendamento
            );

            if (conflitoHorario) {
                throw erroDeRegra(409, 'O horário deste agendamento já esta ocupado.')
            }
        }

        if (statusAtual !== 'realizado' && novoStatus === 'realizado') {
            const estoque = await agendamentoModel.buscarEstoque(vacinaId);
            if (!estoque) {
                throw erroDeRegra(409, 'Não existe estoque desta vacina neste posto.');
            }

            const qtdEstoque = estoque.quantidade !== undefined ? estoque.quantidade : estoque.quantidade_estoque;

            if (qtdEstoque <= 0) {
                throw erroDeRegra(409, 'Não há doses disponíveis desta vacina neste posto.');
            }

            const linhasAfetadasEstoque = await agendamentosModel.decrementarEstoque(vacinaId);
            if (linhasAfetadasEstoque === 0) {
                throw erroDeRegra(409, 'Não foi possível atualizar o estoque da vacina neste posto.');
            }
        }

        await agendamentoModel.atualizarStatusAgendamento(novoStatus, idAgendamento);
        await connection.commit();
        connection.release();

        return { mensagem: 'Status do agendamento atualizado com sucesso.' };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }

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

const agendamentosPendentes = async (postoId, vacinaId) => {
    const statusAgendamento = 'agendado';

    const totalPendentes = await agendamentoModel.findAgendamentosPendentes(postoId, vacinaId, statusAgendamento);
    return totalPendentes;
}

export default {
    getAll,
    getById,
    create,
    update,
    remove,
    listarPorPaciente,
    agendamentosPendentes
}

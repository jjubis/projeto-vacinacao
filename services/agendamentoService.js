import { pool } from "../config/database.js";
import agendamentoModel from "../models/agendamentoModel.js";

const SELECT_BASE = `
    SELECT
    a.id,
    a.paciente_id,
    a.vacina_id,
    a.posto_id,
    DATE_FORMAT(a.data_agendamento, '%Y-%m-%d %H:%i:%s') AS data_agendamento,
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

const dataAtualNoBrasil = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const partesDataHoraLocal = (valor) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(valor || ''));
    if (!match) return null;
    const [, ano, mes, dia, hora, minuto, segundo = '00'] = match;
    const componentes = [ano, mes, dia, hora, minuto, segundo].map(Number);
    const instanteLocal = Date.UTC(componentes[0], componentes[1] - 1, componentes[2], componentes[3], componentes[4], componentes[5]);
    const validado = new Date(instanteLocal);
    if (validado.getUTCFullYear() !== componentes[0] || validado.getUTCMonth() !== componentes[1] - 1 ||
        validado.getUTCDate() !== componentes[2] || validado.getUTCHours() !== componentes[3] ||
        validado.getUTCMinutes() !== componentes[4] || validado.getUTCSeconds() !== componentes[5]) return null;

    const agoraBrasil = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).reduce((partes, parte) => {
        if (parte.type !== 'literal') partes[parte.type] = Number(parte.value);
        return partes;
    }, {});
    const instanteAtualBrasil = Date.UTC(agoraBrasil.year, agoraBrasil.month - 1, agoraBrasil.day,
        agoraBrasil.hour, agoraBrasil.minute, agoraBrasil.second);

    return {
        instanteLocal,
        instanteAtualBrasil,
        dataSql: `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`,
        diaDaSemana: validado.getUTCDay(),
        hora: componentes[3],
        minuto: componentes[4]
    };
};

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

    const dataAgendamento = partesDataHoraLocal(data_agendamento);
    if (!dataAgendamento) {
        throw { status: 400, message: 'Data e hora do agendamento inv?lidos.' };
    }
    if (dataAgendamento.instanteLocal <= dataAgendamento.instanteAtualBrasil) {
        throw { status: 400, message: 'O agendamento deve ser realizado para uma data futura.' };
    }

    const { diaDaSemana, hora, minuto } = dataAgendamento;

    if (diaDaSemana === 0 || diaDaSemana === 6) {
        throw { status: 400, message: 'A UBS não realiza vacinações aos finais de semana.' }
    }

    if (hora < 8 || hora > 17 || (hora === 17 && minuto > 0)) {
        throw { status: 400, message: 'Os agendamentos devem ser realizados entre 08:00 e 17:00.' }
    }

    // if (agendamentoModel.verificarConflitoHorario(posto_id, data_agendamento, 'agendado')) {
    //     throw { status: 409, message: 'Este horário já está ocupado. Escolha outro horário.' }
    // }

    const conflito = await agendamentoModel.verificarConflitoHorario(posto_id, dataAgendamento.dataSql, 'agendado');
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
            await agendamentoModel.atualizarAgendamentoExistente(posto_id, 'agendado', dataAgendamento.dataSql, agendamentoExistente.id);
            return { message: 'Agendamento realizado com sucesso.', id: agendamentoExistente.id };
        }
    }

    const resultado = await agendamentoModel.inserirAgendamento(paciente_id, vacina_id, posto_id, 'agendado', dataAgendamento.dataSql);
    return { mensagem: 'Agendamento realizado com sucesso.', id: resultado };
};

const update = async (agendamentoId, dadosOuStatus, usuario = {}) => {
    const status = typeof dadosOuStatus === 'object' && dadosOuStatus !== null
        ? dadosOuStatus.status
        : dadosOuStatus;
    const dose = typeof dadosOuStatus === 'object' && dadosOuStatus !== null
        ? String(dadosOuStatus.dose || '').trim()
        : '';
    const idAgendamento = Number(agendamentoId);

    if (!Number.isInteger(idAgendamento) || idAgendamento <= 0) {
        throw erroDeRegra(400, 'ID do agendamento inv?lido.');
    }
    if (!['agendado', 'realizado', 'cancelado'].includes(status)) {
        throw erroDeRegra(400, 'Status de agendamento inv?lido.');
    }
    if (status === 'realizado' && (!dose || dose.length > 50)) {
        throw erroDeRegra(400, 'Informe a dose aplicada (at? 50 caracteres).');
    }
    if (status === 'realizado' && !String(usuario.nome || '').trim()) {
        throw erroDeRegra(400, 'N?o foi poss?vel identificar o profissional respons?vel.');
    }

    const connection = await pool.getConnection();
    let transacaoIniciada = false;
    try {
        await connection.beginTransaction();
        transacaoIniciada = true;
        const agendamento = await agendamentoModel.buscarAgendamentoPorId(idAgendamento, connection, true);
        if (!agendamento) throw erroDeRegra(404, 'Agendamento n?o encontrado.');

        if (agendamento.status === status) {
            await connection.rollback();
            transacaoIniciada = false;
            return { mensagem: 'O agendamento j? possui este status.' };
        }

        const transicaoPermitida =
            (agendamento.status === 'agendado' && ['realizado', 'cancelado'].includes(status)) ||
            (agendamento.status === 'cancelado' && status === 'agendado');
        if (!transicaoPermitida) throw erroDeRegra(400, 'Transi??o de status n?o permitida.');

        if (status === 'agendado') {
            const dataAgendamento = partesDataHoraLocal(agendamento.data_agendamento_local || agendamento.data_agendamento);
            if (!dataAgendamento || dataAgendamento.instanteLocal <= dataAgendamento.instanteAtualBrasil) {
                throw erroDeRegra(400, 'N?o ? poss?vel reativar um agendamento com data/hora inv?lida ou passada.');
            }
            const estoque = await agendamentoModel.buscarEstoque(agendamento.vacina_id, connection, true);
            const pendentes = await agendamentoModel.buscarAgendamentosPendentesExcetoId(
                agendamento.posto_id, agendamento.vacina_id, 'agendado', idAgendamento
            );
            if (!estoque || Number(estoque.quantidade_estoque) - Number(pendentes) <= 0) {
                throw erroDeRegra(409, 'N?o h? doses dispon?veis para reativar este agendamento.');
            }
            const conflito = await agendamentoModel.verificarConflitoHorarioExcetoId(
                agendamento.posto_id, agendamento.data_agendamento_local || agendamento.data_agendamento, 'agendado', idAgendamento
            );
            if (conflito) throw erroDeRegra(409, 'O hor?rio deste agendamento j? est? ocupado.');
        }

        if (status === 'realizado') {
            const dataAgendada = partesDataHoraLocal(agendamento.data_agendamento_local || agendamento.data_agendamento);
            if (!dataAgendada || dataAgendada.instanteLocal > dataAgendada.instanteAtualBrasil) {
                throw erroDeRegra(400, 'A aplicacao nao pode ser registrada antes do horario agendado.');
            }
            const estoque = await agendamentoModel.buscarEstoque(agendamento.vacina_id, connection, true);
            if (!estoque || Number(estoque.quantidade_estoque) <= 0) {
                throw erroDeRegra(409, 'N?o h? doses dispon?veis desta vacina.');
            }
            const decrementadas = await agendamentoModel.decrementarEstoque(agendamento.vacina_id, connection);
            if (decrementadas !== 1) throw erroDeRegra(409, 'Estoque insuficiente para registrar a aplica??o.');

            const vacina = await agendamentoModel.buscarLoteVacina(
                agendamento.vacina_id, dataAtualNoBrasil(), connection
            );
            if (!vacina || Number(vacina.vencida)) {
                throw erroDeRegra(409, 'Não é possível registrar a aplicação de uma vacina vencida.');
            }
            await agendamentoModel.registrarAplicacao({
                paciente_id: agendamento.paciente_id,
                vacina_id: agendamento.vacina_id,
                lote: vacina?.lote || null,
                data_aplicacao: dataAtualNoBrasil(),
                dose,
                profissional_responsavel: String(usuario.nome).trim()
            }, connection);
        }

        await agendamentoModel.atualizarStatusAgendamento(status, idAgendamento, connection);
        await connection.commit();
        transacaoIniciada = false;
        return { mensagem: 'Status do agendamento atualizado com sucesso.' };
    } catch (error) {
        if (transacaoIniciada) await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const remove = async (id) => {
    const idAgendamento = Number(id);
    if (!Number.isInteger(idAgendamento) || idAgendamento <= 0) {
        throw erroDeRegra(400, 'ID do agendamento inválido.');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const agendamento = await agendamentoModel.buscarAgendamentoPorId(idAgendamento, connection, true);
        if (!agendamento) throw erroDeRegra(404, 'Agendamento não encontrado.');
        if (agendamento.status === 'realizado') {
            throw erroDeRegra(409, 'Agendamentos realizados não podem ser excluídos; o registro deve permanecer no histórico.');
        }
        await agendamentoModel.excluirAgendamento(idAgendamento, connection);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
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

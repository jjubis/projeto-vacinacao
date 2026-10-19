import agendamentosService from '../services/agendamentoService.js';
import { notificarCidadao, notificarFuncionarios } from '../services/notificacoesService.js';

async function registrarNotificacao(promise) {
    try { await promise; } catch (error) { console.error('Falha ao registrar notificação:', error.message); }
}

const getAll = async (req, res, next) => {
    try {
        const agendamentos = await agendamentosService.getAll();
        res.json({ success: true, message: 'Agendamentos listados com sucesso', data: agendamentos });
    } catch (error) {
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const agendamento = await agendamentosService.getById(req.params.id);

        if (!agendamento) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        res.json({ success: true, message: 'Agendamento encontrado', data: agendamento });
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        // const { paciente_id, vacina_id, posto_id, data_agendamento } = req.body;

        // if (!paciente_id || !vacina_id || !posto_id || !data_agendamento) {
        //     return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
        // }

        // const agendamento = await agendamentosService.create(req.body);
        // res.status(201).json({ success: true, message: 'Agendamento cadastrado com sucesso', data: agendamento });

        const usuario = req.usuario || req.session?.usuario;

        const resposta = await agendamentosService.create(usuario, req.body);

        const pacienteId = usuario.papel === 'cidadao' ? usuario.paciente_id : req.body.paciente_id;
        const agendamentoId = resposta.id || resposta.data?.id;
        await registrarNotificacao(notificarCidadao(pacienteId, 'agendamento', 'Agendamento confirmado',
            `Seu agendamento de vacinação foi confirmado${req.body.data_agendamento ? ` para ${req.body.data_agendamento}` : ''}.`,
            agendamentoId ? `agendamento:${agendamentoId}:confirmado` : null));
        await registrarNotificacao(notificarFuncionarios('agendamento', 'Novo agendamento',
            `Um novo agendamento foi registrado para o cidadão ${pacienteId}.`,
            agendamentoId ? `agendamento:${agendamentoId}:novo` : null));

        return res.status(201).json(resposta);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error('Erro ao criar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
};

const update = async (req, res, next) => {
    try {
        const existing = await agendamentosService.getById(req.params.id);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        const agendamento = await agendamentosService.update(req.params.id, req.body);
        if (req.body.status && req.body.status !== existing.status) {
            const categoria = req.body.status === 'cancelado' ? 'cancelamento' : 'agendamento';
            const titulo = req.body.status === 'cancelado' ? 'Agendamento cancelado' : 'Agendamento atualizado';
            const mensagem = req.body.status === 'cancelado'
                ? `O agendamento ${req.params.id} foi cancelado.`
                : `O status do agendamento ${req.params.id} foi atualizado para ${req.body.status}.`;
            await registrarNotificacao(notificarCidadao(existing.paciente_id || existing.pacienteId, categoria, titulo, mensagem,
                `agendamento:${req.params.id}:${req.body.status}`));
        }
        res.json({ success: true, message: 'Agendamento atualizado com sucesso', data: agendamento });
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        const existing = await agendamentosService.getById(req.params.id);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        await registrarNotificacao(notificarCidadao(existing.paciente_id || existing.pacienteId,
            'cancelamento', 'Agendamento cancelado', `O agendamento ${req.params.id} foi cancelado.`,
            `agendamento:${req.params.id}:cancelado`));

        await agendamentosService.remove(req.params.id);
        res.json({ success: true, message: 'Agendamento removido com sucesso', data: {} });
    } catch (error) {
        next(error);
    }
};

const listarMeusAgendamentos = async (req, res, next) => {
    try {
        const pacienteId = req.usuario.id;

        const agendamentos = await agendamentosService.listarPorPaciente(pacienteId);

        return res.status(200).json({
            success: true,
            data: agendamentos
        });
    } catch (error) {
        next(error);
    }
};

const agendamentosPendentes = async (req, res, next) => {
    try {
        const { postoId, vacinaId } = req.params;

        if (!postoId || !vacinaId) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetros de postoId e vacinaId são obrigatórios'
            });
        }

        const totalPendentes = await agendamentosService.agendamentosPendentes(postoId, vacinaId);

        return res.status(200).json({
            success: true,
            data: { totalPendentes }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getAll,
    getById,
    create,
    update,
    remove,
    listarMeusAgendamentos,
    agendamentosPendentes
};

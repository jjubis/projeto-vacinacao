import agendamentosService from '../services/agendamentoService.js';

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
        const agendamento = await agendamentosService.create(req.body);
        res.status(201).json({ success: true, message: 'Agendamento cadastrado com sucesso', data: agendamento });
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const existing = await agendamentosService.getById(req.params.id);

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        const agendamento = await agendamentosService.update(req.params.id, req.body);
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

export default { getAll, getById, create, update, remove, listarMeusAgendamentos };

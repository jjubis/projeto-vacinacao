import historicoService from '../services/historicoService.js';

const getAll = async (req, res, next) => {
  try {
    const historico = await historicoService.getAll();
    res.json({ success: true, message: 'Histórico vacinal listado com sucesso', data: historico });
  } catch (error) {
    next(error);
  }
};

// Lista o histórico vacinal de um paciente específico
const getByPaciente = async (req, res, next) => {
  try {
    const historico = await historicoService.getByPaciente(req.params.pacienteId);
    res.json({ success: true, message: 'Histórico do paciente listado com sucesso', data: historico });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const registro = await historicoService.create(req.body);
    res.status(201).json({ success: true, message: 'Registro de vacinação cadastrado com sucesso', data: registro });
  } catch (error) {
    next(error);
  }
};

export default { getAll, getByPaciente, create };

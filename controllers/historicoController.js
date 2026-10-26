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

const getMeuHistorico = async (req, res, next) => {
  try {
    const historico = await historicoService.getByPaciente(req.usuario.paciente_id);
    return res.json({ success: true, data: historico });
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

const getCarteirinha = async (req, res, next) => {
  try {
    const { pacienteId } = req.params;
    if (req.usuario.papel === 'cidadao' && Number(req.usuario.paciente_id) !== Number(pacienteId)) {
      return res.status(403).json({ success: false, message: 'Você não tem permissão para consultar este histórico.' });
    }

    const dadosCarteirinha = await historicoService.buscarCarteirinha(pacienteId);

    if (!dadosCarteirinha.paciente) {
      return res.status(404).json({
        success: false,
        message: "Paciente não encontrado."
      });
    }

    return res.json({
      success: true,
      data: dadosCarteirinha
    });
  } catch (error) {
    console.error("Erro ao buscar carteirinha:", error);
    next(error);
  }
}

export default { getAll, getByPaciente, getMeuHistorico, create, getCarteirinha };

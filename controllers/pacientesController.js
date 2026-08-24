import pacientesService from '../services/pacientesService.js';

const getAll = async (req, res, next) => {
  try {
    const pacientes = await pacientesService.getAll();
    res.json({ success: true, message: 'Pacientes listados com sucesso', data: pacientes, totalPacientes: pacientes.total });
  } catch (error) {
    next(error);
  }
};


const getById = async (req, res, next) => {
  try {
    const paciente = await pacientesService.getById(req.params.id);

    if (!paciente) {
      return res.status(404).json({ success: false, message: 'Paciente não encontrado' });
    }

    res.json({ success: true, message: 'Paciente encontrado', data: paciente });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const paciente = await pacientesService.create(req.body);
    res.status(201).json({ success: true, message: 'Paciente cadastrado com sucesso', data: paciente });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await pacientesService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Paciente não encontrado' });
    }

    const paciente = await pacientesService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Paciente atualizado com sucesso', data: paciente });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const existing = await pacientesService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Paciente não encontrado' });
    }

    await pacientesService.remove(req.params.id);
    res.json({ success: true, message: 'Paciente removido com sucesso', data: {} });
  } catch (error) {
    next(error);
  }
};

export default { getAll, getById, create, update, remove };

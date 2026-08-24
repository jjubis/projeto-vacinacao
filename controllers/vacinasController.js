import vacinasService from '../services/vacinasService.js';

const getAll = async (req, res, next) => {
  try {
    const vacinas = await vacinasService.getAll();
    res.json({ success: true, message: 'Vacinas listadas com sucesso', data: vacinas, totalVacinas: vacinas.total });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const vacina = await vacinasService.getById(req.params.id);

    if (!vacina) {
      return res.status(404).json({ success: false, message: 'Vacina não encontrada' });
    }

    res.json({ success: true, message: 'Vacina encontrada', data: vacina });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const vacina = await vacinasService.create(req.body);
    res.status(201).json({ success: true, message: 'Vacina cadastrada com sucesso', data: vacina });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await vacinasService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vacina não encontrada' });
    }

    const vacina = await vacinasService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Vacina atualizada com sucesso', data: vacina });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const existing = await vacinasService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vacina não encontrada' });
    }

    await vacinasService.remove(req.params.id);
    res.json({ success: true, message: 'Vacina removida com sucesso', data: {} });
  } catch (error) {
    next(error);
  }
};

export default { getAll, getById, create, update, remove };

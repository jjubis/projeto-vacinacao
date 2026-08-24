import postosSaudeService from '../services/postosSaudeService.js';

const getAll = async (req, res, next) => {
  try {
    const postos = await postosSaudeService.getAll();
    res.json({ success: true, message: 'Postos de saúde listados com sucesso', data: postos });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const posto = await postosSaudeService.getById(req.params.id);

    if (!posto) {
      return res.status(404).json({ success: false, message: 'Posto de saúde não encontrado' });
    }

    res.json({ success: true, message: 'Posto de saúde encontrado', data: posto });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const posto = await postosSaudeService.create(req.body);
    res.status(201).json({ success: true, message: 'Posto de saúde cadastrado com sucesso', data: posto });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await postosSaudeService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Posto de saúde não encontrado' });
    }

    const posto = await postosSaudeService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Posto de saúde atualizado com sucesso', data: posto });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const existing = await postosSaudeService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Posto de saúde não encontrado' });
    }

    await postosSaudeService.remove(req.params.id);
    res.json({ success: true, message: 'Posto de saúde removido com sucesso', data: {} });
  } catch (error) {
    next(error);
  }
};

export default { getAll, getById, create, update, remove };

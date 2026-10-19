import vacinasService from '../services/vacinasService.js';
import { verificarAlertasDeVacinas } from '../services/notificacoesService.js';

async function atualizarAlertasVacina() {
  try { await verificarAlertasDeVacinas(); }
  catch (error) { console.error('Falha ao verificar alertas de vacinas:', error.message); }
}

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
    const { nome, fabricante, quantidade_estoque, validade, lote, minimo_alerta } = req.body;

    const quantidade = Number(quantidade_estoque);
    const minimo = Number(minimo_alerta ?? 0);
    if (!nome?.trim() || !Number.isFinite(quantidade) || quantidade < 0 || !Number.isFinite(minimo) || minimo < 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe o nome e quantidades válidas (zero ou maior).'
      })
    }

    const vacina = await vacinasService.create(req.body);
    await atualizarAlertasVacina();
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

    const { quantidade_estoque, minimo_alerta } = req.body;
    if (quantidade_estoque !== undefined && (!Number.isFinite(Number(quantidade_estoque)) || Number(quantidade_estoque) < 0)) {
      return res.status(400).json({ success: false, message: 'A quantidade em estoque deve ser zero ou maior.' });
    }
    if (minimo_alerta !== undefined && (!Number.isFinite(Number(minimo_alerta)) || Number(minimo_alerta) < 0)) {
      return res.status(400).json({ success: false, message: 'O limite mínimo deve ser zero ou maior.' });
    }
    const vacina = await vacinasService.update(req.params.id, req.body);
    await atualizarAlertasVacina();
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

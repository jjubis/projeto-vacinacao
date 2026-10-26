import pacientesService from '../services/pacientesService.js';
import { notificarCidadao, notificarFuncionarios } from '../services/notificacoesService.js';

async function avisarFuncionarios(mensagem, chave) {
  try { await notificarFuncionarios('cadastro', 'Cadastro de cidadão atualizado', mensagem, chave); }
  catch (error) { console.error('Falha ao registrar notificação de cadastro:', error.message); }
}

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
    if (paciente?.id) await avisarFuncionarios(`Um novo cidadão foi cadastrado (ID ${paciente.id}).`, `cadastro:novo:${paciente.id}`);
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
    await avisarFuncionarios(`Os dados cadastrais do cidadão ${req.params.id} foram atualizados.`, `cadastro:atualizado:${req.params.id}:${Date.now()}`);
    try {
      await notificarCidadao(req.params.id, 'cadastro', 'Dados cadastrais atualizados',
        'Seus dados cadastrais foram atualizados pela equipe de atendimento.', `cadastro:cidadao:${req.params.id}:${Date.now()}`);
    } catch (error) { console.error('Falha ao avisar cidadão sobre cadastro:', error.message); }
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

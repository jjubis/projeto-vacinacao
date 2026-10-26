import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import agendamentoController from '../controllers/agendamentoController.js';

const router = Router();
const CAMPOS_OBRIGATORIOS = ['paciente_id', 'vacina_id', 'posto_id', 'data_agendamento'];

router.get('/meus-agendamentos', requireAuth, requireRole('cidadao'), agendamentoController.listarMeusAgendamentos);

router.get('/', requireAuth, requireRole('funcionario'), agendamentoController.getAll);
router.get('/:id', requireAuth, requireRole('cidadao', 'funcionario'), agendamentoController.getById);
router.post('/', requireAuth, (req, res, next) => {
  const campos = req.usuario.papel === 'cidadao'
    ? CAMPOS_OBRIGATORIOS.filter(campo => campo !== 'paciente_id')
    : CAMPOS_OBRIGATORIOS;
  return validateBody(campos)(req, res, next);
}, agendamentoController.create);
router.put('/:id', requireAuth, requireRole('funcionario'), agendamentoController.update);
router.delete('/:id', requireAuth, requireRole('funcionario'), agendamentoController.remove);

export default router;

import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import agendamentoController from '../controllers/agendamentoController.js';

const router = Router();
const CAMPOS_OBRIGATORIOS = ['paciente_id', 'vacina_id', 'posto_id', 'data_agendamento'];

router.get('/meus-agendamentos', requireAuth, agendamentoController.listarMeusAgendamentos);

router.get('/', requireAuth, requireRole('funcionario'), agendamentoController.getAll);
router.get('/:id', agendamentoController.getById);
router.post('/', requireAuth, validateBody(CAMPOS_OBRIGATORIOS), agendamentoController.create);
router.put('/:id', requireAuth, validateBody(CAMPOS_OBRIGATORIOS), agendamentoController.update);
router.delete('/:id', requireAuth, agendamentoController.remove);

export default router;
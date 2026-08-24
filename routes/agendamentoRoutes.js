import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js';
import { requireAuth } from '../middlewares/auth.js';
import agendamentoController from '../controllers/agendamentoController.js';

const router = Router();
const CAMPOS_OBRIGATORIOS = ['paciente_id', 'vacina_id', 'posto_id', 'data_agendamento'];

router.get('/meus-agendamentos', requireAuth, agendamentoController.listarMeusAgendamentos);

router.get('/', agendamentoController.getAll);
router.get('/:id', agendamentoController.getById);
router.post('/', validateBody(CAMPOS_OBRIGATORIOS), agendamentoController.create);
router.put('/:id', validateBody(CAMPOS_OBRIGATORIOS), agendamentoController.update);
router.delete('/:id', agendamentoController.remove);

export default router;
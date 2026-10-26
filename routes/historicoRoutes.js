import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import historicoController from '../controllers/historicoController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole('funcionario'), historicoController.getAll);

router.get('/meu-historico', requireAuth, requireRole('cidadao'), historicoController.getMeuHistorico);

// Histórico de vacinação de um paciente específico
router.get('/paciente/:pacienteId', requireAuth, requireRole('funcionario'), historicoController.getByPaciente);

router.post(
  '/',
  requireAuth,
  requireRole('funcionario'),
  validateBody(['paciente_id', 'vacina_id', 'data_aplicacao', 'dose', 'profissional_responsavel']),
  historicoController.create
);

router.get('/carteirinha/:pacienteId', requireAuth, requireRole('cidadao', 'funcionario'), historicoController.getCarteirinha);

export default router;

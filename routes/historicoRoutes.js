import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import historicoController from '../controllers/historicoController.js';

const router = Router();

router.get('/', historicoController.getAll);

// Histórico de vacinação de um paciente específico
router.get('/paciente/:pacienteId', historicoController.getByPaciente);

router.post(
  '/',
  validateBody(['paciente_id', 'vacina_id', 'data_aplicacao', 'dose', 'profissional_responsavel']),
  historicoController.create
);

export default router;

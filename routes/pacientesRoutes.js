import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import pacientesController from '../controllers/pacientesController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole('funcionario'), pacientesController.getAll);
router.get('/inativos', requireAuth, requireRole('funcionario'), pacientesController.getInactive);
router.get('/:id/auditoria', requireAuth, requireRole('funcionario'), pacientesController.getStatusAudit);
router.get('/:id', requireAuth, requireRole('funcionario'), pacientesController.getById);
router.post('/', requireAuth, requireRole('funcionario'), validateBody(['nome', 'cpf', 'data_nascimento', 'telefone', 'email', 'endereco']), pacientesController.create);
router.put('/:id', requireAuth, requireRole('funcionario'), pacientesController.update);
router.delete('/:id', requireAuth, requireRole('funcionario'), pacientesController.remove);
router.patch('/:id/reativar', requireAuth, requireRole('funcionario'), pacientesController.reactivate);

export default router;

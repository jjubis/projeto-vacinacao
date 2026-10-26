import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import vacinasController from '../controllers/vacinasController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, vacinasController.getAll);
router.get('/:id', requireAuth, vacinasController.getById);
router.post('/', requireAuth, requireRole('funcionario'), validateBody(['nome', 'quantidade_estoque']), vacinasController.create);
router.put('/:id', requireAuth, requireRole('funcionario'), vacinasController.update);
router.delete('/:id', requireAuth, requireRole('funcionario'), vacinasController.remove);

export default router;

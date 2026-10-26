import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import postosSaudeController from '../controllers/postosSaudeController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, postosSaudeController.getAll);
router.get('/:id', requireAuth, postosSaudeController.getById);
router.post('/', requireAuth, requireRole('funcionario'), validateBody(['nome', 'endereco']), postosSaudeController.create);
router.put('/:id', requireAuth, requireRole('funcionario'), validateBody(['nome', 'endereco']), postosSaudeController.update);
router.delete('/:id', requireAuth, requireRole('funcionario'), postosSaudeController.remove);

export default router;

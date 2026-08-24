import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import postosSaudeController from '../controllers/postosSaudeController.js';

const router = Router();

router.get('/', postosSaudeController.getAll);
router.get('/:id', postosSaudeController.getById);
router.post('/', validateBody(['nome', 'endereco']), postosSaudeController.create);
router.put('/:id', validateBody(['nome', 'endereco']), postosSaudeController.update);
router.delete('/:id', postosSaudeController.remove);

export default router;

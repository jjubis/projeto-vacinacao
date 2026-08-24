import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import pacientesController from '../controllers/pacientesController.js';

const router = Router();

router.get('/', pacientesController.getAll);
router.get('/:id', pacientesController.getById);
router.post('/', validateBody(['nome', 'cpf', 'data_nascimento']), pacientesController.create);
router.put('/:id', validateBody(['nome', 'cpf', 'data_nascimento']), pacientesController.update);
router.delete('/:id', pacientesController.remove);

export default router;

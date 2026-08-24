import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import vacinasController from '../controllers/vacinasController.js';

const router = Router();

router.get('/', vacinasController.getAll);
router.get('/:id', vacinasController.getById);
router.post('/', validateBody(['nome', 'quantidade_estoque']), vacinasController.create);
router.put('/:id', validateBody(['nome', 'quantidade_estoque']), vacinasController.update);
router.delete('/:id', vacinasController.remove);

export default router;

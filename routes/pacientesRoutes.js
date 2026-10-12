import { Router } from 'express';
import validateBody from '../middlewares/validateRequest.js'
import pacientesController from '../controllers/pacientesController.js';
import { requireRole } from '../utils/middlewares.js';

const router = Router();

router.get('/', requireRole('funcionario'), pacientesController.getAll);
router.get('/:id', requireRole('funcionario'), pacientesController.getById);
router.post('/', requireRole('funcionario'), validateBody(['nome', 'cpf', 'data_nascimento', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep']), pacientesController.create);
router.put('/:id', requireRole('funcionario'), validateBody(['nome', 'cpf', 'data_nascimento', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep']), pacientesController.update);
router.delete('/:id', requireRole('funcionario'), pacientesController.remove);

export default router;

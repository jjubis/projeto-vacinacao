import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import controller from '../controllers/notificacoesController.js';

const router = Router();
router.use(requireAuth);
router.get('/', controller.listar);
router.get('/nao-lidas/contagem', controller.contador);
router.patch('/ler-todas', controller.marcarTodas);
router.patch('/:id/lida', controller.marcarLida);
export default router;

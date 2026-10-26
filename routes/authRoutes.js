import { Router } from 'express';
import authController from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Rota pública de cadastro do cidadão
router.post('/cadastro', authController.registerCidadao);

// Rota pública de login
router.post('/login', authController.login);

// A criação de novas contas de funcionário fica restrita à equipe autenticada.
router.post('/admin/cadastrar-funcionario', requireAuth, requireRole('funcionario'), authController.registerFuncionario);
router.get('/funcionarios', requireAuth, requireRole('funcionario'), authController.listarFuncionarios);

export default router;

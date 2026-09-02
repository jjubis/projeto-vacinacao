import { Router } from 'express';
import authController from '../controllers/authController.js';

const router = Router();

// Rota pública de cadastro do cidadão
router.post('/cadastro', authController.registerCidadao);

// Rota pública de login
router.post('/login', authController.login);

// Rota interna (que você pode proteger com middleware de autenticação depois)
router.post('/admin/cadastrar-funcionario', authController.registerFuncionario);
router.get('/funcionarios', authController.listarFuncionarios);

export default router;
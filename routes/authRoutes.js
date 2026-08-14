import express from 'express';
import { hashSenha, verificarSenha } from '../utils/auth.js';
import { requireRole } from '../utils/middlewares.js';

const router = express.Router();

export default (db) => {

   // Cadastro de novo usuário — SOMENTE cidadão pode se autorregistrar
    router.post('/registrar', async (req, res) => {
        try {
            const { nome, email, senha, cpf } = req.body;

            if (!nome || !email || !senha || !cpf) {
                return res.status(400).json({ error: 'Nome, email, senha e CPF são obrigatórios.' });
            }

            if (senha.length < 8) {
                return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
            }

            const cpfLimpo = cpf.replace(/\D/g, '');

            if (cpfLimpo.length !== 11) {
                return res.status(400).json({ error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' });
            }

            const cidadao = db.prepare('SELECT id FROM cidadaos WHERE cpf = ?').get(cpfLimpo);
            if (!cidadao) {
                return res.status(400).json({
                    error: 'CPF não encontrado. Você precisa estar cadastrado como cidadão em um posto de saúde antes de criar seu acesso.'
                });
            }

            const jaTemLogin = db.prepare('SELECT id FROM usuarios WHERE cidadaoId = ?').get(cidadao.id);
            if (jaTemLogin) {
                return res.status(409).json({ error: 'Este cidadão já possui um acesso cadastrado.' });
            }

            const emailExistente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
            if (emailExistente) {
                return res.status(409).json({ error: 'Este email já está cadastrado.' });
            }

            const senhaHash = await hashSenha(senha);

            const info = db.prepare(`
                INSERT INTO usuarios (nome, email, senhaHash, papel, cidadaoId)
                VALUES (?, ?, ?, 'cidadao', ?)
            `).run(nome, email, senhaHash, cidadao.id);

            res.status(201).json({ message: 'Usuário criado com sucesso', id: info.lastInsertRowid });

        } catch (error) {
            console.error('❌ Erro ao registrar usuário:', error.message);
            res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
        }
    });

    // Criação de funcionário — SOMENTE outro funcionário logado pode criar
    router.post('/registrar-funcionario', requireRole('funcionario'), async (req, res) => {
        try {
            const { nome, email, senha } = req.body;

            if (!nome || !email || !senha) {
                return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
            }
            if (senha.length < 8) {
                return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
            }

            const emailExistente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
            if (emailExistente) {
                return res.status(409).json({ error: 'Este email já está cadastrado.' });
            }

            const senhaHash = await hashSenha(senha);
            const info = db.prepare(`
                INSERT INTO usuarios (nome, email, senhaHash, papel, cidadaoId)
                VALUES (?, ?, ?, 'funcionario', NULL)
            `).run(nome, email, senhaHash);

            res.status(201).json({ message: 'Funcionário criado com sucesso', id: info.lastInsertRowid });

        } catch (error) {
            console.error('❌ Erro ao registrar funcionário:', error.message);
            res.status(500).json({ error: 'Erro interno ao registrar funcionário.' });
        }
    });

    // Login
    router.post('/login', async (req, res) => {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
            }

            const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

            // Mensagem genérica de propósito - não revela se o email existe ou não
            if (!usuario) {
                return res.status(401).json({ error: 'Email ou senha inválidos.' });
            }

            const senhaValida = await verificarSenha(senha, usuario.senhaHash);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Email ou senha inválidos.' });
            }

            // Regenera a sessão para evitar "session fixation"
            req.session.regenerate((err) => {
                if (err) {
                    console.error('❌ Erro ao regenerar sessão:', err);
                    return res.status(500).json({ error: 'Erro interno ao criar sessão.' });
                }

                req.session.usuario = {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    papel: usuario.papel,
                    cidadaoId: usuario.cidadaoId
                };

                res.json({ message: 'Login realizado com sucesso', usuario: req.session.usuario });
            });

        } catch (error) {
            console.error('❌ Erro ao fazer login:', error.message);
            res.status(500).json({ error: 'Erro interno ao fazer login.' });
        }
    });

    // Logout
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('❌ Erro ao destruir sessão:', err);
                return res.status(500).json({ error: 'Erro ao fazer logout.' });
            }
            res.clearCookie('connect.sid');
            res.json({ message: 'Logout realizado com sucesso' });
        });
    });

    // Quem está logado agora
    router.get('/me', (req, res) => {
        if (!req.session.usuario) {
            return res.status(401).json({ error: 'Não autenticado.' });
        }
        res.json({ usuario: req.session.usuario });
    });

    return router;
};
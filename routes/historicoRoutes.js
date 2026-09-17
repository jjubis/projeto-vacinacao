import express from 'express';
import { requireAuth } from '../utils/middlewares.js';

const router = express.Router();

export default (db) => {
    router.get('/meu', requireAuth, (req, res) => {
        const usuario = req.session.usuario;

        if (usuario.papel !== 'cidadao' || !usuario.cidadaoId) {
            return res.status(403).json({
                error: 'Apenas cidadãos podem acessar o próprio histórico vacinal.'
            });
        }

        try {
            const historico = db.prepare(`
                SELECT
                    h.id,
                    h.dataAplicacao,
                    h.agendamentoId,
                    v.nome AS vacinaNome,
                    v.fabricante AS vacinaFabricante,
                    p.nome AS postoNome,
                    p.endereco AS postoEndereco
                FROM historico_vacinal h
                INNER JOIN vacinas v ON v.id = h.vacinaId
                INNER JOIN agendamentos a ON a.id = h.agendamentoId
                INNER JOIN postos_saude p ON p.id = a.postoId
                WHERE h.cidadaoId = ?
                ORDER BY h.dataAplicacao DESC
            `).all(usuario.cidadaoId);

            return res.json(historico);
        } catch (error) {
            console.error('Erro ao buscar histórico vacinal:', error);
            return res.status(500).json({ error: 'Erro ao buscar histórico vacinal.' });
        }
    });

    return router;
};

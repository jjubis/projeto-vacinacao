import express from 'express';

const router = express.Router();

export default (db) => {
    router.get('/', (req, res) => {
        const statuses = db.prepare('SELECT * FROM statuses').all();
        res.json(statuses);
    });
    
    router.post('/', (req, res) => {
        try {
            const { descricao } = req.body;
            if (!descricao) {
                return res.status(400).json({ error: 'Descrição é um campo obrigatório.' });
            }
            const info = db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run(descricao);
            res.status(201).json({ message: 'Status adicionado com sucesso', id: info.lastInsertRowid });
        } catch (error) {
            res.status(400).json({ error: 'Erro ao adicionar status', details: error.message });
        }
    });
    
    // A rota PUT para status não é comum, mas se precisar, pode ser implementada
    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { descricao } = req.body;
            if (!descricao) {
                return res.status(400).json({ error: 'Descrição é um campo obrigatório para atualização.' });
            }
            const info = db.prepare('UPDATE statuses SET descricao = ? WHERE id = ?').run(descricao, id);
            if (info.changes > 0) {
                res.json({ message: 'Status atualizado com sucesso' });
            } else {
                res.status(404).json({ error: 'Status não encontrado' });
            }
        } catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar status', details: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const info = db.prepare('DELETE FROM statuses WHERE id = ?').run(id);
            if (info.changes > 0) {
                res.json({ message: 'Status excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Status não encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir status', details: error.message });
        }
    });
    
    return router;
};
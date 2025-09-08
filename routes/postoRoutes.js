import express from 'express';

const router = express.Router();

export default (db) => {
    router.get('/', (req, res) => {
        const postos = db.prepare('SELECT * FROM postos_saude').all();
        res.json(postos);
    });
    
    router.get('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const posto = db.prepare('SELECT * FROM postos_saude WHERE id = ?').get(id);
            if (posto) {
                res.json(posto);
            } else {
                res.status(404).json({ error: 'Posto de saúde não encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar posto de saúde', details: error.message });
        }
    });

    router.post('/', (req, res) => {
        try {
            const { nome, endereco } = req.body;
            if (!nome || !endereco) {
                return res.status(400).json({ error: 'Nome e endereço são campos obrigatórios.' });
            }
            const info = db.prepare('INSERT INTO postos_saude (nome, endereco) VALUES (?, ?)').run(nome, endereco);
            res.status(201).json({ message: 'Posto de saúde adicionado com sucesso', id: info.lastInsertRowid });
        } catch (error) {
            res.status(400).json({ error: 'Erro ao adicionar posto de saúde', details: error.message });
        }
    });

    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { nome, endereco } = req.body;
            const query = 'UPDATE postos_saude SET nome = COALESCE(?, nome), endereco = COALESCE(?, endereco) WHERE id = ?';
            const info = db.prepare(query).run(nome || null, endereco || null, id);
            if (info.changes > 0) {
                res.json({ message: 'Posto de saúde atualizado com sucesso' });
            } else {
                res.status(404).json({ error: 'Posto de saúde não encontrado' });
            }
        } catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar posto de saúde', details: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const info = db.prepare('DELETE FROM postos_saude WHERE id = ?').run(id);
            if (info.changes > 0) {
                res.json({ message: 'Posto de saúde excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Posto de saúde não encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir posto de saúde', details: error.message });
        }
    });

    return router;
};
import express from 'express';

const router = express.Router();

export default (db) => {
    router.get('/', (req, res) => {
        const vacinas = db.prepare('SELECT * FROM vacinas').all();
        res.json(vacinas);
    });
    
    router.get('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const vacina = db.prepare('SELECT * FROM vacinas WHERE id = ?').get(id);
            if (vacina) {
                res.json(vacina);
            } else {
                res.status(404).json({ error: 'Vacina não encontrada' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar vacina', details: error.message });
        }
    });

    router.post('/', (req, res) => {
        try {
            const { nome, fabricante, validade } = req.body;
            if (!nome || !fabricante || !validade) {
                return res.status(400).json({ error: 'Nome, fabricante e validade são campos obrigatórios.' });
            }
            const info = db.prepare('INSERT INTO vacinas (nome, fabricante, validade) VALUES (?, ?, ?)').run(nome, fabricante, validade);
            res.status(201).json({ message: 'Vacina adicionada com sucesso', id: info.lastInsertRowid });
        } catch (error) {
            res.status(400).json({ error: 'Erro ao adicionar vacina', details: error.message });
        }
    });

    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { nome, fabricante, validade } = req.body;
            const query = 'UPDATE vacinas SET nome = COALESCE(?, nome), fabricante = COALESCE(?, fabricante), validade = COALESCE(?, validade) WHERE id = ?';
            const info = db.prepare(query).run(nome || null, fabricante || null, validade || null, id);
            if (info.changes > 0) {
                res.json({ message: 'Vacina atualizada com sucesso' });
            } else {
                res.status(404).json({ error: 'Vacina não encontrada' });
            }
        } catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar vacina', details: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const info = db.prepare('DELETE FROM vacinas WHERE id = ?').run(id);
            if (info.changes > 0) {
                res.json({ message: 'Vacina excluída com sucesso' });
            } else {
                res.status(404).json({ error: 'Vacina não encontrada' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir vacina', details: error.message });
        }
    });

    return router;
};
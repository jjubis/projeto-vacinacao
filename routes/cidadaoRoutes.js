import express from 'express';

const router = express.Router();

export default (db) => {
    // Rota GET para listar todos os cidadãos
    router.get('/', (req, res) => {
        const cidadaos = db.prepare('SELECT * FROM cidadaos').all();
        res.json(cidadaos);
    });

    // Rota GET para buscar um cidadão por ID
    router.get('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const cidadao = db.prepare('SELECT * FROM cidadaos WHERE id = ?').get(id);
            if (cidadao) {
                res.json(cidadao);
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar cidadão', details: error.message });
        }
    });

    // Rota POST para adicionar um novo cidadão
    router.post('/', (req, res) => {
        try {
            const { nome, cpf, telefone, email, endereco } = req.body;
            if (!nome || !cpf) {
                return res.status(400).json({ error: 'Nome e CPF são campos obrigatórios.' });
            }
            const info = db.prepare('INSERT INTO cidadaos (nome, cpf, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)').run(nome, cpf, telefone, email, endereco);
            res.status(201).json({ message: 'Cidadão adicionado com sucesso', id: info.lastInsertRowid });
        } catch (error) {
            res.status(400).json({ error: 'Erro ao adicionar cidadão', details: error.message });
        }
    });

    // Rota PUT para atualizar um cidadão por ID
    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { nome, cpf, telefone, email, endereco } = req.body;
            const query = 'UPDATE cidadaos SET nome = COALESCE(?, nome), cpf = COALESCE(?, cpf), telefone = COALESCE(?, telefone), email = COALESCE(?, email), endereco = COALESCE(?, endereco) WHERE id = ?';
            const info = db.prepare(query).run(nome || null, cpf || null, telefone || null, email || null, endereco || null, id);
            if (info.changes > 0) {
                res.json({ message: 'Cidadão atualizado com sucesso' });
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }
        } catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar cidadão', details: error.message });
        }
    });

    // Rota DELETE para excluir um cidadão por ID
    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const info = db.prepare('DELETE FROM cidadaos WHERE id = ?').run(id);
            if (info.changes > 0) {
                res.json({ message: 'Cidadão excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir cidadão', details: error.message });
        }
    });

    return router;
};
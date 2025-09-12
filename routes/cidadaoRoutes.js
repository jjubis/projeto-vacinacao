import express from 'express';

const router = express.Router();

// Funções utilitárias para validar CPF e telefone (exatamente 11 dígitos numéricos)
function cpfEhValido(cpf) {
    return /^\d{11}$/.test(cpf);
}

function telefoneEhValido(telefone) {
    return /^\d{11}$/.test(telefone);
}

// Função para limpar CPF (remove tudo que não é número)
function limparCpf(cpf) {
    return cpf.replace(/\D/g, '');
}

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

    // Rota POST para adicionar um novo cidadão com tratamento de transação
    router.post('/', (req, res) => {
    try {
        let { nome, cpf, telefone, email, endereco } = req.body;

        cpf = limparCpf(cpf);
        telefone = telefone.replace(/\D/g, '');

        const addCidadao = db.transaction(() => {
            const cpfExistente = db.prepare(`
                SELECT id FROM cidadaos 
                WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
            `).get(cpf);

            console.log('Resultado da verificação de CPF duplicado:', cpfExistente);

            if (cpfExistente) {
                throw new Error('CPF já cadastrado.');
            }

            const stmt = db.prepare(`
                INSERT INTO cidadaos (nome, cpf, telefone, email, endereco)
                VALUES (?, ?, ?, ?, ?)
            `);
            const info = stmt.run(nome, cpf, telefone, email, endereco);

            return info.lastInsertRowid;
        });

        const id = addCidadao();

        console.log(`Cidadão ${nome} cadastrado com sucesso com ID ${id}`);
        res.status(201).json({ message: 'Cidadão adicionado com sucesso', id });

    } catch (error) {

        console.error('Erro ao adicionar cidadão:', error);
        if (error.message === 'CPF já cadastrado.') {
            return res.status(409).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Erro ao adicionar cidadão', details: error.message });
    }
});

    // Rota PUT para atualizar um cidadão por ID
    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            let { nome, cpf, telefone, email, endereco } = req.body;

            if (cpf) {
                cpf = limparCpf(cpf);
                if (!cpfEhValido(cpf)) {
                    return res.status(400).json({ error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' });
                }
            }

            if (telefone) {
                telefone = telefone.replace(/\D/g, '');
                if (!telefoneEhValido(telefone)) {
                    return res.status(400).json({ error: 'Telefone inválido. Deve conter exatamente 11 dígitos numéricos.' });
                }
            }

            const query = `
                UPDATE cidadaos
                SET nome = COALESCE(?, nome),
                    cpf = COALESCE(?, cpf),
                    telefone = COALESCE(?, telefone),
                    email = COALESCE(?, email),
                    endereco = COALESCE(?, endereco)
                WHERE id = ?
            `;

            const info = db.prepare(query).run(
                nome || null,
                cpf || null,
                telefone || null,
                email || null,
                endereco || null,
                id
            );

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

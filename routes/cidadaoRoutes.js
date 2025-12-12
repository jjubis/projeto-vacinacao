import express from 'express';
import { capitalizarNome } from '../utils/formatarNome.js';

const router = express.Router();

// Funções utilitárias para validar CPF e telefone (exatamente 11 dígitos numéricos)
function cpfEhValido(cpf) {
    return /^\d{11}$/.test(cpf);
}

function telefoneEhValido(telefone) {
    // Verifica se tem 11 dígitos numéricos
    return /^\d{11}$/.test(telefone);
}

function emailEhValido(email) {
    // Padrão que exige caracteres antes e depois do @, e um ponto (.) seguido por 2 ou mais letras, sem espaços.
    // Ex: nome@dominio.com
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// Função para limpar CPF e Telefone (remove tudo que não é número)
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

    // Rota POST para adicionar um novo cidadão com validações
    router.post('/', (req, res) => {
        try {
            let { nome, cpf, telefone, email, endereco } = req.body;
            
            // 1. Limpeza e Formatação
            nome = capitalizarNome(nome);
            cpf = limparCpf(cpf);
            telefone = telefone.replace(/\D/g, '');
            
            // 2. Validações de Formato (CPF, Telefone, Email)
            if (!cpfEhValido(cpf)) {
                return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos numéricos.' });
            }
            if (!telefoneEhValido(telefone)) {
                return res.status(400).json({ error: 'Telefone inválido. Deve conter 11 dígitos numéricos.' });
            }
            if (!emailEhValido(email)) {
                return res.status(400).json({ error: 'Email inválido. Verifique o formato (ex: nome@exemplo.com) e a ausência de espaços.' });
            }

            // 3. Transação de Inserção e Verificação de Unicidade
            const addCidadao = db.transaction(() => {
                
                // Verificação de CPF Duplicado
                const cpfExistente = db.prepare(`SELECT id FROM cidadaos WHERE cpf = ?`).get(cpf);
                if (cpfExistente) {
                    throw new Error('CPF já cadastrado.');
                }
                
                // Verificação de Telefone Duplicado
                const telefoneExistente = db.prepare(`SELECT id FROM cidadaos WHERE telefone = ?`).get(telefone);
                if (telefoneExistente) {
                    // Novo erro: Telefone Duplicado
                    throw new Error('Telefone já cadastrado. Por favor, utilize outro número.'); 
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
            // Novo tratamento de erro para Telefone
            if (error.message.includes('Telefone já cadastrado')) {
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
            
            if (nome) nome = capitalizarNome(nome);

            // Validações na atualização
            if (cpf) {
                cpf = limparCpf(cpf);
                if (!cpfEhValido(cpf)) {
                    return res.status(400).json({ error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' });
                }
                // Adicionar verificação de unicidade para CPF aqui, excluindo o próprio ID
                const cpfExistente = db.prepare('SELECT id FROM cidadaos WHERE cpf = ? AND id != ?').get(cpf, id);
                if (cpfExistente) {
                     return res.status(409).json({ error: 'Novo CPF já cadastrado em outro cidadão.' });
                }
            }

            if (telefone) {
                telefone = telefone.replace(/\D/g, '');
                if (!telefoneEhValido(telefone)) {
                    return res.status(400).json({ error: 'Telefone inválido. Deve conter exatamente 11 dígitos numéricos.' });
                }
                // Adicionar verificação de unicidade para Telefone aqui, excluindo o próprio ID
                const telExistente = db.prepare('SELECT id FROM cidadaos WHERE telefone = ? AND id != ?').get(telefone, id);
                if (telExistente) {
                    return res.status(409).json({ error: 'Novo Telefone já cadastrado em outro cidadão.' });
                }
            }
            
            if (email && !emailEhValido(email)) {
                return res.status(400).json({ error: 'Novo Email inválido. Verifique o formato.' });
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
            console.error('Erro ao atualizar cidadão:', error);
            res.status(400).json({ error: 'Erro ao atualizar cidadão', details: error.message });
        }
    });

    // Rota DELETE para excluir um cidadão por ID
    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            // Se o index.js tiver ON DELETE CASCADE, isso apagará agendamentos e histórico.
            const info = db.prepare('DELETE FROM cidadaos WHERE id = ?').run(id); 
            if (info.changes > 0) {
                res.json({ message: 'Cidadão excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }
        } catch (error) {
            // Este catch agora é importante para capturar erros de FOREIGN KEY se o CASCADE falhar
            res.status(500).json({ error: 'Erro ao excluir cidadão. Verifique se há agendamentos pendentes ou se o banco foi inicializado com ON DELETE CASCADE.', details: error.message });
        }
    });

    return router;
};
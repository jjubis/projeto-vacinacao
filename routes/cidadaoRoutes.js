import express from 'express';
import { capitalizarNome } from '../utils/formatarNome.js';
import { requireRole } from '../utils/middlewares.js';

const router = express.Router();

function cpfEhValido(cpf) {
    return /^\d{11}$/.test(cpf);
}

function telefoneEhValido(telefone) {
    return /^\d{10,11}$/.test(telefone);
}

function emailEhValido(email) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
        return false;
    }

    if (email.includes(' ')) {
        return false;
    }

    const [, domain] = email.split('@');
    if (!domain || !domain.includes('.')) {
        return false;
    }

    return true;
}

function limparCpf(cpf) {
    return cpf.replace(/\D/g, '');
}

function limparTelefone(telefone) {
    return telefone.replace(/\D/g, '');
}

export default (db) => {
    
  router.get('/', requireRole('funcionario'), (req, res) => {
        try {
            const cidadaos = db.prepare('SELECT * FROM cidadaos').all();
            res.json(cidadaos);
        } catch (error) {
            console.error('Erro ao listar cidadãos:', error);
            res.status(500).json({ error: 'Erro ao listar cidadãos', details: error.message });
        }
    });

    router.get('/:id', requireRole('funcionario'), (req, res) => {
        try {
            const { id } = req.params;
            const cidadao = db.prepare('SELECT * FROM cidadaos WHERE id = ?').get(id);
            
            if (cidadao) {
                res.json(cidadao);
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }
        } catch (error) {
            console.error('Erro ao buscar cidadão:', error);
            res.status(500).json({ error: 'Erro ao buscar cidadão', details: error.message });
        }
    });

   router.post('/', requireRole('funcionario'), (req, res) => {
        try {
            let { nome, cpf, telefone, email, endereco } = req.body;

            if (!nome || !cpf || !telefone || !email || !endereco) {
                return res.status(400).json({ 
                    error: 'Todos os campos são obrigatórios (nome, cpf, telefone, email, endereco)' 
                });
            }

            nome = capitalizarNome(nome);
            cpf = limparCpf(cpf);
            telefone = limparTelefone(telefone);
            email = email.trim().toLowerCase();

            if (!cpfEhValido(cpf)) {
                return res.status(400).json({ 
                    error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' 
                });
            }

            if (!telefoneEhValido(telefone)) {
                return res.status(400).json({ 
                    error: 'Telefone inválido. Deve conter 10 ou 11 dígitos numéricos (DDD + número).' 
                });
            }

            if (!emailEhValido(email)) {
                return res.status(400).json({ 
                    error: 'Email inválido. Verifique o formato (ex: nome@exemplo.com.br) e a ausência de espaços.' 
                });
            }
       
            const addCidadao = db.transaction(() => {
                
                const cpfExistente = db.prepare('SELECT id FROM cidadaos WHERE cpf = ?').get(cpf);
                if (cpfExistente) {
                    throw new Error('CPF já cadastrado no sistema.');
                }

                const telefoneExistente = db.prepare('SELECT id FROM cidadaos WHERE telefone = ?').get(telefone);
                if (telefoneExistente) {
                    throw new Error('Telefone já cadastrado. Por favor, utilize outro número.');
                }

                const emailExistente = db.prepare('SELECT id FROM cidadaos WHERE email = ?').get(email);
                if (emailExistente) {
                    throw new Error('Email já cadastrado. Por favor, utilize outro email.');
                }

                const stmt = db.prepare(`
                    INSERT INTO cidadaos (nome, cpf, telefone, email, endereco)
                    VALUES (?, ?, ?, ?, ?)
                `);
                const info = stmt.run(nome, cpf, telefone, email, endereco);

                return info.lastInsertRowid;
            });

            const id = addCidadao();

            console.log(`✅ Cidadão ${nome} cadastrado com sucesso (ID: ${id})`);
            res.status(201).json({ 
                message: 'Cidadão cadastrado com sucesso', 
                id 
            });

        } catch (error) {
            console.error('❌ Erro ao cadastrar cidadão:', error.message);

            if (error.message.includes('já cadastrado')) {
                return res.status(409).json({ error: error.message });
            }

            return res.status(500).json({ 
                error: 'Erro ao cadastrar cidadão', 
                details: error.message 
            });
        }
    });

  router.put('/:id', requireRole('funcionario'), (req, res) => {
        try {
            const { id } = req.params;
            let { nome, cpf, telefone, email, endereco } = req.body;

            if (nome) nome = capitalizarNome(nome);
            if (cpf) cpf = limparCpf(cpf);
            if (telefone) telefone = limparTelefone(telefone);
            if (email) email = email.trim().toLowerCase(); 
            if (cpf && !cpfEhValido(cpf)) {
                return res.status(400).json({ 
                    error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' 
                });
            }

            if (telefone && !telefoneEhValido(telefone)) {
                return res.status(400).json({ 
                    error: 'Telefone inválido. Deve conter 10 ou 11 dígitos numéricos.' 
                });
            }

            if (email && !emailEhValido(email)) {
                return res.status(400).json({ 
                    error: 'Email inválido. Verifique o formato correto.' 
                });
            }

            if (cpf) {
                const cpfExistente = db.prepare('SELECT id FROM cidadaos WHERE cpf = ? AND id != ?').get(cpf, id);
                if (cpfExistente) {
                    return res.status(409).json({ error: 'Novo CPF já cadastrado em outro cidadão.' });
                }
            }

            if (telefone) {
                const telExistente = db.prepare('SELECT id FROM cidadaos WHERE telefone = ? AND id != ?').get(telefone, id);
                if (telExistente) {
                    return res.status(409).json({ error: 'Novo telefone já cadastrado em outro cidadão.' });
                }
            }

            if (email) {
                const emailExistente = db.prepare('SELECT id FROM cidadaos WHERE email = ? AND id != ?').get(email, id);
                if (emailExistente) {
                    return res.status(409).json({ error: 'Novo email já cadastrado em outro cidadão.' });
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
                console.log(`✅ Cidadão ID ${id} atualizado com sucesso`);
                res.json({ message: 'Cidadão atualizado com sucesso' });
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar cidadão:', error);
            res.status(400).json({ 
                error: 'Erro ao atualizar cidadão', 
                details: error.message 
            });
        }
    });

    router.delete('/:id', requireRole('funcionario'), (req, res) => {
        try {
            const { id } = req.params;
            const info = db.prepare('DELETE FROM cidadaos WHERE id = ?').run(id);

            if (info.changes > 0) {
                console.log(`✅ Cidadão ID ${id} excluído com sucesso`);
                res.json({ message: 'Cidadão excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Cidadão não encontrado' });
            }
        } catch (error) {
            console.error('❌ Erro ao excluir cidadão:', error);

            if (error.message.includes('FOREIGN KEY constraint failed')) {
                return res.status(409).json({ 
                    error: 'Não é possível excluir: existem agendamentos associados a este cidadão.' 
                });
            }

            res.status(500).json({ 
                error: 'Erro ao excluir cidadão', 
                details: error.message 
            });
        }
    });

    return router;
};
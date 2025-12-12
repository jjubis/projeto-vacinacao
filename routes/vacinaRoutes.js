import express from 'express';
const router = express.Router();

import { capitalizarNome } from '../utils/formatarNome.js'; 

export default (db) => {

    // ===============================
    // CADASTRAR VACINA (POST)
    // ===============================
    router.post('/', (req, res) => {
        // Agora aceitamos postoId no corpo da requisição para adicionar o estoque detalhado
        const { nome, fabricante, validade, postoId } = req.body; 
        
        // 1. Validação
        if (!nome || !fabricante || !validade || !postoId) {
             return res.status(400).json({ error: 'Nome, fabricante, validade e Posto ID são obrigatórios.' });
        }
        
        try {
            // Formata os nomes (Se a função existir)
            const nomeFormatado = capitalizarNome ? capitalizarNome(nome) : nome;
            const fabricanteFormatado = capitalizarNome ? capitalizarNome(fabricante) : fabricante;

            // 2. Transação para garantir que a Vacina e o Estoque sejam criados juntos
            const result = db.transaction(() => {
                
                // 2a. INSERT INTO vacinas
                // CORREÇÃO: Usando db.prepare().run()
                const infoVacina = db.prepare(
                    'INSERT INTO vacinas (nome, fabricante, validade) VALUES (?, ?, ?)'
                ).run(nomeFormatado, fabricanteFormatado, validade);
                
                const newVacinaId = infoVacina.lastInsertRowid;
                
                // 2b. INSERT NO ESTOQUE DETALHADO (10 doses iniciais no Posto fornecido)
                db.prepare(`
                    INSERT INTO estoque (postoId, vacinaId, quantidade) 
                    VALUES (?, ?, 10)
                `).run(postoId, newVacinaId);

                return {
                    mensagem: 'Vacina cadastrada e 10 doses adicionadas ao estoque do posto.',
                    idVacina: newVacinaId
                };
            })(); 

            res.status(201).json(result);
            
        } catch (error) {
            console.error('Erro ao cadastrar vacina/estoque:', error.message);
            
            // Verifica se o erro é por chave estrangeira (postoId inválido)
            if (error.message.includes('FOREIGN KEY constraint failed') || error.message.includes('SQLITE_CONSTRAINT')) {
                 return res.status(400).json({ error: 'Erro de dados: Posto ID inválido ou Vacina duplicada.', details: error.message });
            }
            res.status(500).json({ error: 'Erro interno no servidor ao cadastrar vacina.', details: error.message });
        }
    });

    // ===============================
    // GET /vacinas - Listar todas as vacinas
    // ===============================
    router.get('/', (req, res) => {
        try {
            // CORREÇÃO: Usando db.prepare().all()
            const vacinas = db.prepare('SELECT id, nome, fabricante, validade FROM vacinas').all();
            res.status(200).json(vacinas);
        } catch (error) {
            console.error('Erro ao listar vacinas:', error);
            res.status(500).json({ error: 'Erro interno ao listar vacinas.', details: error.message });
        }
    });

    // ===============================
    // GET /vacinas/:id - Buscar vacina por ID
    // ===============================
    router.get('/:id', (req, res) => {
        const { id } = req.params;
        try {
            // CORREÇÃO: Usando db.prepare().get()
            const vacina = db.prepare('SELECT id, nome, fabricante, validade FROM vacinas WHERE id = ?').get(id);
            if (vacina) {
                res.status(200).json(vacina);
            } else {
                res.status(404).json({ error: 'Vacina não encontrada.' });
            }
        } catch (error) {
            console.error('Erro ao buscar vacina:', error);
            res.status(500).json({ error: 'Erro interno ao buscar vacina.', details: error.message });
        }
    });

    // ===============================
    // PUT /vacinas/:id - Atualizar vacina
    // ===============================
    router.put('/:id', (req, res) => {
        const { id } = req.params;
        const { nome, fabricante, validade } = req.body;
        
        const vacinaAtualizada = {};
        // Usando a função importada
        if (nome) vacinaAtualizada.nome = capitalizarNome ? capitalizarNome(nome) : nome;
        if (fabricante) vacinaAtualizada.fabricante = capitalizarNome ? capitalizarNome(fabricante) : fabricante;
        if (validade) vacinaAtualizada.validade = validade;

        if (Object.keys(vacinaAtualizada).length === 0) {
            return res.status(400).json({ error: 'Pelo menos um campo deve ser fornecido para atualização (nome, fabricante ou validade).' });
        }

        try {
            const sets = [];
            const values = [];

            for (const key in vacinaAtualizada) {
                sets.push(`${key} = ?`);
                values.push(vacinaAtualizada[key]);
            }
            values.push(id);

            const sql = `UPDATE vacinas SET ${sets.join(', ')} WHERE id = ?`;
            // CORREÇÃO: Usando db.prepare().run()
            const result = db.prepare(sql).run(...values);

            if (result.changes > 0) {
                res.status(200).json({ message: 'Vacina atualizada com sucesso.' });
            } else {
                res.status(404).json({ error: 'Vacina não encontrada ou nenhum dado novo fornecido.' });
            }
        } catch (error) {
            console.error('Erro ao atualizar vacina:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar vacina.', details: error.message });
        }
    });

    // ===============================
    // DELETE /vacinas/:id - Excluir vacina
    // ===============================
    router.delete('/:id', (req, res) => {
        const { id } = req.params;
        try {
            // CORREÇÃO: Usando db.prepare().run()
            const result = db.prepare('DELETE FROM vacinas WHERE id = ?').run(id);
            if (result.changes > 0) {
                res.status(200).json({ message: 'Vacina excluída com sucesso.' });
            } else {
                res.status(404).json({ error: 'Vacina não encontrada.' });
            }
        } catch (error) {
            console.error('Erro ao excluir vacina:', error);
            res.status(500).json({ error: 'Erro interno ao excluir vacina.', details: error.message });
        }
    });
    
    return router;
};
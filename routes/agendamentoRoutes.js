import express from 'express';
const router = express.Router();

const STATUS_AGENDADO_ID = 1;  
const STATUS_REALIZADO_ID = 2; 
const STATUS_CANCELADO_ID = 3;

// ID do Posto que gerencia o estoque central (Posto padrão de inicialização)
const ID_POSTO_ESTOQUE_CENTRAL = 1; 

export default (db) => {

    // Rota GET para listar todos os agendamentos (Join com todos os dados)
   
    router.get('/', (req, res) => {
        try {
            const agendamentos = db.prepare(`
                SELECT
                    a.id, a.dataHora, a.cidadaoId, a.vacinaId, a.postoId, a.statusId,
                    c.nome AS cidadaoNome, c.cpf AS cidadaoCPF, c.endereco AS cidadaoEndereco,
                    v.nome AS vacinaNome, v.fabricante AS vacinaFabricante,
                    p.nome AS postoNome, p.endereco AS postoEndereco,
                    s.descricao AS statusDescricao
                FROM agendamentos a
                JOIN cidadaos c ON a.cidadaoId = c.id
                JOIN vacinas v ON a.vacinaId = v.id
                JOIN postos_saude p ON a.postoId = p.id
                JOIN statuses s ON a.statusId = s.id
            `).all();
            res.json(agendamentos);
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error.message);
            res.status(500).json({ error: 'Erro interno ao listar agendamentos', details: error.message });
        }
    });

    // Rota POST para criar agendamento (Com Validação de Duplicidade Ativa)

    router.post('/', (req, res) => {
        try {
            const { cidadaoId, vacinaId, postoId, dataHora } = req.body;
            
            const statusId = req.body.statusId || STATUS_AGENDADO_ID; 

            if (!cidadaoId || !vacinaId || !postoId || !dataHora) {
                return res.status(400).json({ error: 'Dados obrigatórios ausentes (cidadaoId, vacinaId, postoId, dataHora).' });
            }
            
            // 1. VALIDAÇÃO DE DUPLICIDADE 
            const existingAppointment = db.prepare(`
                SELECT a.id, s.descricao 
                FROM agendamentos a
                JOIN statuses s ON a.statusId = s.id
                WHERE a.cidadaoId = ? 
                  AND a.vacinaId = ? 
                  AND a.statusId != ? 
            `).get(cidadaoId, vacinaId, STATUS_CANCELADO_ID);
            
            if (existingAppointment) {
                return res.status(409).json({ 
                    error: `Este cidadão já possui um agendamento para esta vacina com status '${existingAppointment.descricao}'.`,
                    details: 'Um novo agendamento só é permitido se o anterior estiver Realizado ou Cancelado.'
                });
            }

            // 2. INSERÇÃO DO AGENDAMENTO
            const info = db.prepare(`
                INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
                VALUES (?, ?, ?, ?, ?)
            `).run(cidadaoId, vacinaId, postoId, statusId, dataHora);
            
            res.status(201).json({ message: 'Agendamento criado com sucesso', id: info.lastInsertRowid });

        } catch (error) {
            
            console.error('Erro ao criar agendamento:', error.message);
            res.status(400).json({ error: 'Erro ao criar agendamento', details: error.message });
        }
    });

    // Rota PUT para atualizar status (Com Lógica de Estoque Centralizada)
    
    router.put('/:id', (req, res) => {
        const { id } = req.params;
        const newStatusId = parseInt(req.body.statusId);

        if (isNaN(newStatusId)) {
            return res.status(400).json({ error: 'Status ID inválido.' });
        }

        try {
            const currentAppointment = db.prepare('SELECT vacinaId, postoId, cidadaoId, statusId FROM agendamentos WHERE id = ?').get(id);

            if (!currentAppointment) {
                return res.status(404).json({ error: 'Agendamento não encontrado.' });
            }

            const oldStatusId = currentAppointment.statusId;
            const isBecomingRealizado = newStatusId === STATUS_REALIZADO_ID && oldStatusId !== STATUS_REALIZADO_ID;
            const isNoLongerRealizado = oldStatusId === STATUS_REALIZADO_ID && newStatusId !== STATUS_REALIZADO_ID;
            
            db.transaction(() => {

                const updateInfo = db.prepare('UPDATE agendamentos SET statusId = ? WHERE id = ?').run(newStatusId, id);
                if (updateInfo.changes === 0) {
                    throw new Error('Agendamento não encontrado durante a atualização.'); 
                }

                if (isBecomingRealizado) {
                    const { vacinaId, cidadaoId } = currentAppointment;
                    
                    const postoEstoqueId = ID_POSTO_ESTOQUE_CENTRAL; 
                    
                    const baixaEstoqueInfo = db.prepare(`
                        UPDATE estoque 
                        SET quantidade = quantidade - 1 
                        WHERE postoId = ? AND vacinaId = ? AND quantidade > 0
                    `).run(postoEstoqueId, vacinaId); 

                    if (baixaEstoqueInfo.changes === 0) {
                        throw new Error('Falha na baixa de estoque. Estoque insuficiente ou item não encontrado no estoque central.'); 
                    }

                    const dataAplicacao = new Date().toISOString();
                    db.prepare(`
                        INSERT INTO historico_vacinal (cidadaoId, vacinaId, dataAplicacao, agendamentoId) 
                        VALUES (?, ?, ?, ?)
                    `).run(cidadaoId, vacinaId, dataAplicacao, id);
                }
                
                if (isNoLongerRealizado) {
                    const { vacinaId } = currentAppointment;
                    
                    const postoEstoqueId = ID_POSTO_ESTOQUE_CENTRAL; 
                    
                    db.prepare(
                        'UPDATE estoque SET quantidade = quantidade + 1 WHERE postoId = ? AND vacinaId = ?'
                    ).run(postoEstoqueId, vacinaId); 

                    db.prepare('DELETE FROM historico_vacinal WHERE agendamentoId = ?').run(id);
                }

            })();

            res.json({ message: 'Agendamento atualizado e estoque processado com sucesso' });

        } catch (error) {
        
            const status = error.message.includes('Estoque insuficiente') ? 409 : 
                           error.message.includes('Agendamento não encontrado') ? 404 : 
                           400; 
            
            console.error('Erro ao processar atualização de agendamento/estoque:', error.message);
            res.status(status).json({ error: error.message, details: error.message });
        }
    });

    // Rota DELETE para excluir agendamento
    
    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const info = db.prepare('DELETE FROM agendamentos WHERE id = ?').run(id);
            if (info.changes > 0) {
                res.json({ message: 'Agendamento excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Agendamento não encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir agendamento', details: error.message });
        }
    });

    return router;
};
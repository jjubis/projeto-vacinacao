import express from 'express';
import { requireAuth, requireRole } from '../utils/middlewares.js';
const router = express.Router();
const STATUS_AGENDADO_ID = 1;
const STATUS_REALIZADO_ID = 2;
const STATUS_CANCELADO_ID = 3;
const ID_POSTO_ESTOQUE_CENTRAL = 1;

export default (db) => {

    router.get('/', requireRole('funcionario'), (req, res) => {
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
                ORDER BY a.dataHora DESC
            `).all();

            res.json(agendamentos);
        } catch (error) {
            console.error('❌ Erro ao buscar agendamentos:', error.message);
            res.status(500).json({ 
                error: 'Erro interno ao listar agendamentos', 
                details: error.message 
            });
        }
    });

    router.post('/', requireAuth, (req, res) => {
        try {
            const { cidadaoId, vacinaId, postoId, dataHora } = req.body;
            const statusId = req.body.statusId || STATUS_AGENDADO_ID;

            if (!cidadaoId || !vacinaId || !postoId || !dataHora) {
                return res.status(400).json({ 
                    error: 'Dados obrigatórios ausentes (cidadaoId, vacinaId, postoId, dataHora).' 
                });
            }
            const dataAgendamento = new Date(dataHora);
            const agora = new Date();

            if (dataAgendamento < agora) {
                return res.status(400).json({ 
                    error: 'Data do agendamento não pode ser no passado.' 
                });
            }

            const existingAppointment = db.prepare(`
                SELECT a.id, s.descricao, a.statusId
                FROM agendamentos a
                JOIN statuses s ON a.statusId = s.id
                WHERE a.cidadaoId = ? 
                  AND a.vacinaId = ?
            `).get(cidadaoId, vacinaId);

            if (existingAppointment) {
    
                if (existingAppointment.statusId === STATUS_AGENDADO_ID) {
                    return res.status(409).json({ 
                        error: `Este cidadão já possui um agendamento pendente para esta vacina com status '${existingAppointment.descricao}'.`,
                        details: 'Cancele ou realize o agendamento anterior antes de criar um novo.'
                    });
                }
                
                if (existingAppointment.statusId === STATUS_REALIZADO_ID) {
                    return res.status(409).json({ 
                        error: `Este cidadão já recebeu esta vacina (status: ${existingAppointment.descricao}).`,
                        details: 'Não é permitido agendar novamente uma vacina já aplicada.'
                    });
                }

    
                console.log(`⚠️  Agendamento anterior (ID: ${existingAppointment.id}) estava cancelado. Permitindo novo agendamento.`);
            }

            const info = db.prepare(`
                INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
                VALUES (?, ?, ?, ?, ?)
            `).run(cidadaoId, vacinaId, postoId, statusId, dataHora);

            console.log(`✅ Agendamento criado com sucesso (ID: ${info.lastInsertRowid})`);
            res.status(201).json({ 
                message: 'Agendamento criado com sucesso', 
                id: info.lastInsertRowid 
            });

        } catch (error) {
            console.error('❌ Erro ao criar agendamento:', error.message);

            if (error.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ 
                    error: 'Já existe um agendamento ativo para esta combinação de cidadão e vacina.',
                    details: 'Verifique os agendamentos existentes antes de criar um novo.'
                });
            }

            res.status(400).json({ 
                error: 'Erro ao criar agendamento', 
                details: error.message 
            });
        }
    });

    router.put('/:id', requireRole('funcionario'), (req, res) => {
        const { id } = req.params;
        const newStatusId = parseInt(req.body.statusId);

        if (isNaN(newStatusId)) {
            return res.status(400).json({ error: 'Status ID inválido.' });
        }

        try {
           
            const currentAppointment = db.prepare(
                'SELECT vacinaId, postoId, cidadaoId, statusId FROM agendamentos WHERE id = ?'
            ).get(id);

            if (!currentAppointment) {
                return res.status(404).json({ error: 'Agendamento não encontrado.' });
            }

            const oldStatusId = currentAppointment.statusId;
            const isBecomingRealizado = newStatusId === STATUS_REALIZADO_ID && oldStatusId !== STATUS_REALIZADO_ID;
            const isNoLongerRealizado = oldStatusId === STATUS_REALIZADO_ID && newStatusId !== STATUS_REALIZADO_ID;

            db.transaction(() => {

                const updateInfo = db.prepare(
                    'UPDATE agendamentos SET statusId = ? WHERE id = ?'
                ).run(newStatusId, id);

                if (updateInfo.changes === 0) {
                    throw new Error('Agendamento não encontrado durante a atualização.');
                }
                if (isBecomingRealizado) {
                    const { vacinaId, cidadaoId } = currentAppointment;
                    const postoEstoqueId = ID_POSTO_ESTOQUE_CENTRAL;
                    const estoqueAtual = db.prepare(
                        'SELECT quantidade FROM estoque WHERE postoId = ? AND vacinaId = ?'
                    ).get(postoEstoqueId, vacinaId);

                    if (!estoqueAtual || estoqueAtual.quantidade <= 0) {
                        throw new Error('Estoque insuficiente ou item não encontrado no estoque central.');
                    }

                    const baixaEstoqueInfo = db.prepare(`
                        UPDATE estoque 
                        SET quantidade = quantidade - 1 
                        WHERE postoId = ? AND vacinaId = ? AND quantidade > 0
                    `).run(postoEstoqueId, vacinaId);

                    if (baixaEstoqueInfo.changes === 0) {
                        throw new Error('Falha na baixa de estoque. Estoque insuficiente ou item não encontrado.');
                    }

                    const dataAplicacao = new Date().toISOString();
                    db.prepare(`
                        INSERT INTO historico_vacinal (cidadaoId, vacinaId, dataAplicacao, agendamentoId) 
                        VALUES (?, ?, ?, ?)
                    `).run(cidadaoId, vacinaId, dataAplicacao, id);

                    console.log(`✅ Estoque atualizado: -1 dose (Vacina ID: ${vacinaId}, Posto ID: ${postoEstoqueId})`);
                }

                if (isNoLongerRealizado) {
                    const { vacinaId } = currentAppointment;
                    const postoEstoqueId = ID_POSTO_ESTOQUE_CENTRAL;

                    db.prepare(
                        'UPDATE estoque SET quantidade = quantidade + 1 WHERE postoId = ? AND vacinaId = ?'
                    ).run(postoEstoqueId, vacinaId);

                    db.prepare('DELETE FROM historico_vacinal WHERE agendamentoId = ?').run(id);

                    console.log(`✅ Estoque atualizado: +1 dose devolvida (Vacina ID: ${vacinaId}, Posto ID: ${postoEstoqueId})`);
                }

            })();

            console.log(`✅ Agendamento ID ${id} atualizado para status ${newStatusId}`);
            res.json({ message: 'Agendamento atualizado e estoque processado com sucesso' });

        } catch (error) {
            console.error('❌ Erro ao processar atualização de agendamento/estoque:', error.message);

            const status = error.message.includes('Estoque insuficiente') ? 409 :
                           error.message.includes('Agendamento não encontrado') ? 404 :
                           500;

            res.status(status).json({ 
                error: error.message, 
                details: error.message 
            });
        }
    });

    router.delete('/:id', requireRole('funcionario'), (req, res) => {
        try {
            const { id } = req.params;
            const agendamento = db.prepare(
                'SELECT statusId FROM agendamentos WHERE id = ?'
            ).get(id);

            if (!agendamento) {
                return res.status(404).json({ error: 'Agendamento não encontrado' });
            }

            if (agendamento.statusId === STATUS_REALIZADO_ID) {
                return res.status(409).json({ 
                    error: 'Não é possível excluir agendamentos realizados.',
                    details: 'Agendamentos realizados são mantidos para histórico.'
                });
            }

            const info = db.prepare('DELETE FROM agendamentos WHERE id = ?').run(id);

            if (info.changes > 0) {
                console.log(`✅ Agendamento ID ${id} excluído com sucesso`);
                res.json({ message: 'Agendamento excluído com sucesso' });
            } else {
                res.status(404).json({ error: 'Agendamento não encontrado' });
            }
        } catch (error) {
            console.error('❌ Erro ao excluir agendamento:', error);
            res.status(500).json({ 
                error: 'Erro ao excluir agendamento', 
                details: error.message 
            });
        }
    });

    return router;
};
import express from 'express';
import { requireAuth, requireRole } from '../utils/middlewares.js';

const router = express.Router();

// IDs fixos dos status
const STATUS_AGENDADO = 1;
const STATUS_REALIZADO = 2;
const STATUS_CANCELADO = 3;

export default (db) => {

    // =========================================================
    // MEUS AGENDAMENTOS
    // =========================================================
    router.get('/meus', requireAuth, (req, res) => {

        try {

            const usuario = req.session.usuario;

            if (usuario.papel !== 'cidadao') {
                return res.status(403).json({
                    error: 'Apenas cidadãos podem acessar seus próprios agendamentos.'
                });
            }

            const cidadaoId = usuario.cidadaoId;

            if (!cidadaoId) {
                return res.status(400).json({
                    error: 'Este usuário não está associado a um cidadão.'
                });
            }

            const agendamentos = db.prepare(`
                SELECT
                    a.id,
                    a.cidadaoId,
                    a.vacinaId,
                    a.postoId,
                    a.statusId,
                    a.dataHora,

                    c.nome AS cidadaoNome,
                    c.cpf AS cidadaoCPF,

                    v.nome AS vacinaNome,
                    v.fabricante AS vacinaFabricante,
                    v.validade AS vacinaValidade,

                    p.nome AS postoNome,
                    p.endereco AS postoEndereco,

                    s.descricao AS statusDescricao

                FROM agendamentos a

                INNER JOIN cidadaos c
                    ON c.id = a.cidadaoId

                INNER JOIN vacinas v
                    ON v.id = a.vacinaId

                INNER JOIN postos_saude p
                    ON p.id = a.postoId

                INNER JOIN statuses s
                    ON s.id = a.statusId

                WHERE a.cidadaoId = ?

                ORDER BY a.dataHora DESC
            `).all(cidadaoId);

            return res.json(agendamentos);

        } catch (error) {

            console.error('Erro ao buscar meus agendamentos:', error);

            return res.status(500).json({
                error: 'Erro ao buscar seus agendamentos.'
            });
        }
    });


    // =========================================================
    // LISTAR TODOS OS AGENDAMENTOS
    // =========================================================
    router.get('/', requireRole('funcionario'), (req, res) => {

        try {

            const agendamentos = db.prepare(`
                SELECT
                    a.id,
                    a.cidadaoId,
                    a.vacinaId,
                    a.postoId,
                    a.statusId,
                    a.dataHora,

                    c.nome AS cidadaoNome,
                    c.cpf AS cidadaoCPF,
                    c.endereco AS cidadaoEndereco,

                    v.nome AS vacinaNome,
                    v.fabricante AS vacinaFabricante,
                    v.validade AS vacinaValidade,

                    p.nome AS postoNome,
                    p.endereco AS postoEndereco,

                    s.descricao AS statusDescricao

                FROM agendamentos a

                INNER JOIN cidadaos c
                    ON c.id = a.cidadaoId

                INNER JOIN vacinas v
                    ON v.id = a.vacinaId

                INNER JOIN postos_saude p
                    ON p.id = a.postoId

                INNER JOIN statuses s
                    ON s.id = a.statusId

                ORDER BY a.dataHora DESC
            `).all();

            return res.json(agendamentos);

        } catch (error) {

            console.error('Erro ao listar agendamentos:', error);

            return res.status(500).json({
                error: 'Erro ao listar agendamentos.'
            });
        }
    });


    // =========================================================
    // CRIAR AGENDAMENTO
    // =========================================================
    router.post('/', requireAuth, (req, res) => {

        try {

            const usuario = req.session.usuario;

            let {
                cidadaoId,
                vacinaId,
                postoId,
                dataHora
            } = req.body;

            // Se for cidadão, usamos o ID da sessão
            if (usuario.papel === 'cidadao') {

                if (!usuario.cidadaoId) {
                    return res.status(400).json({
                        error: 'Seu usuário não está associado a um cidadão.'
                    });
                }

                cidadaoId = usuario.cidadaoId;
            }

            if (
                usuario.papel !== 'cidadao' &&
                usuario.papel !== 'funcionario'
            ) {
                return res.status(403).json({
                    error: 'Você não tem permissão para criar agendamentos.'
                });
            }

            if (!cidadaoId || !vacinaId || !postoId || !dataHora) {
                return res.status(400).json({
                    error: 'Cidadão, vacina, posto e data/hora são obrigatórios.'
                });
            }

            cidadaoId = Number(cidadaoId);
            vacinaId = Number(vacinaId);
            postoId = Number(postoId);

            if (
                !Number.isInteger(cidadaoId) ||
                !Number.isInteger(vacinaId) ||
                !Number.isInteger(postoId)
            ) {
                return res.status(400).json({
                    error: 'Os IDs informados são inválidos.'
                });
            }

            const cidadao = db.prepare(`
                SELECT id
                FROM cidadaos
                WHERE id = ?
            `).get(cidadaoId);

            if (!cidadao) {
                return res.status(404).json({
                    error: 'Cidadão não encontrado.'
                });
            }

            const vacina = db.prepare(`
                SELECT id
                FROM vacinas
                WHERE id = ?
            `).get(vacinaId);

            if (!vacina) {
                return res.status(404).json({
                    error: 'Vacina não encontrada.'
                });
            }

            const posto = db.prepare(`
                SELECT id
                FROM postos_saude
                WHERE id = ?
            `).get(postoId);

            if (!posto) {
                return res.status(404).json({
                    error: 'Posto de saúde não encontrado.'
                });
            }

            // Todo novo agendamento começa como "Agendado"
            const statusId = STATUS_AGENDADO;

            const dataAgendamento = new Date(dataHora);

            if (Number.isNaN(dataAgendamento.getTime())) {
                return res.status(400).json({
                    error: 'Data e hora do agendamento inválidas.'
                });
            }

            if (dataAgendamento <= new Date()) {
                return res.status(400).json({
                    error: 'O agendamento deve ser realizado para uma data futura.'
                });
            }

            const agendamentoExistente = db.prepare(`
                SELECT
                    a.id,
                    a.statusId,
                    s.descricao AS status
                FROM agendamentos a

                INNER JOIN statuses s
                    ON s.id = a.statusId

                WHERE a.cidadaoId = ?
                  AND a.vacinaId = ?
            `).get(cidadaoId, vacinaId);

            if (agendamentoExistente) {

                if (agendamentoExistente.statusId === STATUS_AGENDADO) {
                    return res.status(409).json({
                        error: 'Este cidadão já possui um agendamento para esta vacina.'
                    });
                }

                if (agendamentoExistente.statusId === STATUS_REALIZADO) {
                    return res.status(409).json({
                        error: 'Esta vacina já foi realizada para este cidadão.'
                    });
                }

                // Se estiver Cancelado, permite criar outro.
            }

            const resultado = db.prepare(`
                INSERT INTO agendamentos (
                    cidadaoId,
                    vacinaId,
                    postoId,
                    statusId,
                    dataHora
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(
                cidadaoId,
                vacinaId,
                postoId,
                statusId,
                dataHora
            );

            return res.status(201).json({
                mensagem: 'Agendamento realizado com sucesso.',
                id: resultado.lastInsertRowid
            });

        } catch (error) {

            console.error('Erro ao criar agendamento:', error);

            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({
                    error: 'Já existe um agendamento para este cidadão e esta vacina.'
                });
            }

            return res.status(500).json({
                error: 'Erro ao criar agendamento.'
            });
        }
    });


    // =========================================================
    // ATUALIZAR STATUS DO AGENDAMENTO
    // =========================================================
   router.put('/:id', requireRole('funcionario'), (req, res) => {

    console.log(
        'PUT ATUALIZAR AGENDAMENTO:',
        req.params.id,
        req.body
    );

    const agendamentoId = Number(req.params.id);
    const { statusId } = req.body;

    if (!Number.isInteger(agendamentoId)) {
        return res.status(400).json({
            error: 'ID do agendamento inválido.'
        });
    }

    const novoStatus = Number(statusId);

    if (!Number.isInteger(novoStatus)) {
        return res.status(400).json({
            error: 'Status inválido.'
        });
    }

    if (
        ![
            STATUS_AGENDADO,
            STATUS_REALIZADO,
            STATUS_CANCELADO
        ].includes(novoStatus)
    ) {
        return res.status(400).json({
            error: 'Status de agendamento inválido.'
        });
    }

    try {

        console.log('ANTES DA TRANSAÇÃO');

        const atualizar = db.transaction(() => {

            console.log('ENTROU NA TRANSAÇÃO');

            const agendamento = db.prepare(`
                SELECT
                    a.*,
                    s.descricao AS status
                FROM agendamentos a
                INNER JOIN statuses s
                    ON s.id = a.statusId
                WHERE a.id = ?
            `).get(agendamentoId);

            console.log(
                'AGENDAMENTO ENCONTRADO:',
                agendamento
            );

            if (!agendamento) {
                throw new Error(
                    'Agendamento não encontrado.'
                );
            }

            // =============================================
            // Se não houve alteração
            // =============================================

            if (agendamento.statusId === novoStatus) {
                return {
                    mensagem: 'O agendamento já possui este status.'
                };
            }

            // =============================================
            // ALTERANDO PARA REALIZADO
            // =============================================

            if (
                agendamento.statusId !== STATUS_REALIZADO &&
                novoStatus === STATUS_REALIZADO
            ) {

                const estoque = db.prepare(`
                    SELECT quantidade
                    FROM estoque
                    WHERE postoId = ?
                      AND vacinaId = ?
                `).get(
                    agendamento.postoId,
                    agendamento.vacinaId
                );

                console.log(
                    'ESTOQUE ENCONTRADO:',
                    estoque
                );

                if (!estoque) {
                    throw new Error(
                        'Não existe estoque desta vacina neste posto.'
                    );
                }

                if (estoque.quantidade <= 0) {
                    throw new Error(
                        'Não há doses disponíveis desta vacina neste posto.'
                    );
                }

                // Retira 1 dose do estoque
                const resultadoEstoque = db.prepare(`
                    UPDATE estoque
                    SET quantidade = quantidade - 1
                    WHERE postoId = ?
                      AND vacinaId = ?
                      AND quantidade > 0
                `).run(
                    agendamento.postoId,
                    agendamento.vacinaId
                );

                console.log(
                    'RESULTADO UPDATE ESTOQUE:',
                    resultadoEstoque.changes
                );

                if (resultadoEstoque.changes === 0) {
                    throw new Error(
                        'Não foi possível atualizar o estoque da vacina neste posto.'
                    );
                }

                console.log(
                    `Estoque atualizado: posto ${agendamento.postoId}, vacina ${agendamento.vacinaId}, 1 dose retirada.`
                );

                // =============================================
                // REGISTRA NO HISTÓRICO VACINAL
                // =============================================

                db.prepare(`
                    INSERT INTO historico_vacinal (
                        cidadaoId,
                        vacinaId,
                        dataAplicacao,
                        agendamentoId
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    agendamento.cidadaoId,
                    agendamento.vacinaId,
                    new Date().toISOString(),
                    agendamento.id
                );
            }

            // =============================================
            // NÃO PERMITIR VOLTAR DE REALIZADO
            // =============================================

            if (agendamento.statusId === STATUS_REALIZADO) {

                throw new Error(
                    'Um agendamento realizado não pode voltar para outro status.'
                );
            }

            // =============================================
            // ATUALIZA O STATUS DO AGENDAMENTO
            // =============================================

            const resultadoStatus = db.prepare(`
                UPDATE agendamentos
                SET statusId = ?
                WHERE id = ?
            `).run(
                novoStatus,
                agendamentoId
            );

            console.log(
                'RESULTADO UPDATE STATUS:',
                resultadoStatus.changes
            );

            return {
                mensagem: 'Status do agendamento atualizado com sucesso.'
            };
        });

        console.log('DEPOIS DA TRANSAÇÃO');

        // EXECUTA A TRANSAÇÃO
        return res.json(atualizar());

    } catch (erro) {

        console.error(
            'ERRO AO ATUALIZAR AGENDAMENTO:',
            erro
        );

        return res.status(400).json({
            error: erro.message
        });
    }
});
    router.delete('/:id', requireRole('funcionario'), (req, res) => {

        const agendamentoId = Number(req.params.id);

        if (!Number.isInteger(agendamentoId)) {
            return res.status(400).json({
                error: 'ID do agendamento inválido.'
            });
        }

        try {

            const agendamento = db.prepare(`
                SELECT statusId
                FROM agendamentos
                WHERE id = ?
            `).get(agendamentoId);

            if (!agendamento) {
                return res.status(404).json({
                    error: 'Agendamento não encontrado.'
                });
            }

            if (agendamento.statusId === STATUS_REALIZADO) {
                return res.status(400).json({
                    error: 'Não é possível excluir um agendamento que já foi realizado.'
                });
            }

            db.prepare(`
                DELETE FROM agendamentos
                WHERE id = ?
            `).run(agendamentoId);

            return res.json({
                mensagem: 'Agendamento excluído com sucesso.'
            });

        } catch (error) {

            console.error(
                'Erro ao excluir agendamento:',
                error
            );

            return res.status(500).json({
                error: 'Erro ao excluir agendamento.'
            });
        }
    });


    return router;
};
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
    // O cidadão só pode visualizar os próprios agendamentos.
    // O cidadaoId vem da sessão, e NÃO do frontend.
    // =========================================================
    router.get('/meus', requireAuth, (req, res) => {

        try {

            const usuario = req.session.usuario;

            // Funcionário não possui cidadaoId
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
    // Apenas funcionário pode acessar.
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


            // =====================================================
            // CORREÇÃO PRINCIPAL
            // =====================================================
            // Se for cidadão:
            //
            // NÃO confiamos no cidadaoId enviado pelo navegador.
            //
            // Pegamos o cidadaoId diretamente da sessão.
            // =====================================================

            if (usuario.papel === 'cidadao') {

                if (!usuario.cidadaoId) {
                    return res.status(400).json({
                        error: 'Seu usuário não está associado a um cidadão.'
                    });
                }

                cidadaoId = usuario.cidadaoId;
            }


            // =====================================================
            // Se não for cidadão, precisa ser funcionário
            // =====================================================

            if (usuario.papel !== 'cidadao' && usuario.papel !== 'funcionario') {

                return res.status(403).json({
                    error: 'Você não tem permissão para criar agendamentos.'
                });
            }


            // =====================================================
            // Validação dos dados
            // =====================================================

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


            // =====================================================
            // Verifica se o cidadão realmente existe
            // =====================================================

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


            // =====================================================
            // Verifica se a vacina existe
            // =====================================================

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


            // =====================================================
            // Verifica se o posto existe
            // =====================================================

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


            // =====================================================
            // Cidadão SEMPRE cria agendamento como "Agendado"
            // =====================================================
            // Não permitimos que o navegador mande:
            //
            // statusId = 2 → Realizado
            //
            // Isso evita que alguém tente criar diretamente uma
            // vacinação realizada.
            // =====================================================

            const statusId = STATUS_AGENDADO;


            // =====================================================
            // Validação da data
            // =====================================================

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


            // =====================================================
            // Verifica se já existe agendamento para essa vacina
            // =====================================================

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


            // =====================================================
            // Criação do agendamento
            // =====================================================

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

            // Caso seja uma violação da UNIQUE
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
    // Somente funcionário pode alterar.
    // =========================================================
    router.put('/:id', requireRole('funcionario'), (req, res) => {

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

        if (![STATUS_AGENDADO, STATUS_REALIZADO, STATUS_CANCELADO].includes(novoStatus)) {

            return res.status(400).json({
                error: 'Status de agendamento inválido.'
            });
        }

        try {

            const atualizar = db.transaction(() => {

                const agendamento = db.prepare(`
                    SELECT
                        a.*,
                        s.descricao AS status
                    FROM agendamentos a
                    INNER JOIN statuses s
                        ON s.id = a.statusId
                    WHERE a.id = ?
                `).get(agendamentoId);

                if (!agendamento) {
                    throw new Error('Agendamento não encontrado.');
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
                // Realizado
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


                    db.prepare(`
                        UPDATE estoque
                        SET quantidade = quantidade - 1
                        WHERE postoId = ?
                          AND vacinaId = ?
                          AND quantidade > 0
                    `).run(
                        agendamento.postoId,
                        agendamento.vacinaId
                    );


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
                // Não permitir voltar de realizado
                // =============================================

                if (agendamento.statusId === STATUS_REALIZADO) {

                    throw new Error(
                        'Um agendamento realizado não pode voltar para outro status.'
                    );
                }


                // =============================================
                // Atualiza o status
                // =============================================

                db.prepare(`
                    UPDATE agendamentos
                    SET statusId = ?
                    WHERE id = ?
                `).run(
                    novoStatus,
                    agendamentoId
                );


                return {
                    mensagem: 'Status do agendamento atualizado com sucesso.'
                };
            });


            return res.json(atualizar);

        } catch (error) {

            console.error('Erro ao atualizar agendamento:', error);

            if (error.message === 'Agendamento não encontrado.') {

                return res.status(404).json({
                    error: error.message
                });
            }

            return res.status(400).json({
                error: error.message
            });
        }
    });


    // =========================================================
    // EXCLUIR AGENDAMENTO
    // =========================================================
    // Somente funcionário.
    // =========================================================
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


            // Não apagar uma vacinação que já foi realizada.
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

            console.error('Erro ao excluir agendamento:', error);

            return res.status(500).json({
                error: 'Erro ao excluir agendamento.'
            });
        }
    });


    return router;
};
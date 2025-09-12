import express from 'express';

const router = express.Router();

export default (db) => {
    // Rota GET para listar todos os agendamentos (com JOIN)
    router.get('/', (req, res) => {
        const agendamentos = db.prepare(`
            SELECT
    a.id,
    a.dataHora,
    a.cidadaoId,
    a.vacinaId,
    a.postoId,
    a.statusId,
    c.nome AS cidadaoNome,
    c.cpf AS cidadaoCPF,
    c.endereco AS cidadaoEndereco,
    v.nome AS vacinaNome,
    v.fabricante AS vacinaFabricante,
    p.nome AS postoNome,
    p.endereco AS postoEndereco,
    s.descricao AS statusDescricao
FROM agendamentos a
JOIN cidadaos c ON a.cidadaoId = c.id
JOIN vacinas v ON a.vacinaId = v.id
JOIN postos_saude p ON a.postoId = p.id
JOIN statuses s ON a.statusId = s.id
     `).all();
        res.json(agendamentos);
    });

    // Rota POST para criar agendamento
    router.post('/', (req, res) => {
        try {
            const { cidadaoId, vacinaId, postoId, statusId, dataHora } = req.body;
            if (!cidadaoId || !vacinaId || !postoId || !statusId || !dataHora) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
            }

            const statusExiste = db.prepare('SELECT id FROM statuses WHERE id = ?').get(statusId);
            if (!statusExiste) {
                return res.status(400).json({ error: 'Status informado não existe.' });
            }

            const info = db.prepare(`
                INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
                VALUES (?, ?, ?, ?, ?)
            `).run(cidadaoId, vacinaId, postoId, statusId, dataHora);

            res.status(201).json({ message: 'Agendamento criado com sucesso', id: info.lastInsertRowid });
        } catch (error) {
            res.status(400).json({ error: 'Erro ao criar agendamento', details: error.message });
        }
    });

    // Rota PUT para atualizar status do agendamento
    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { statusId } = req.body;

            if (!statusId || isNaN(statusId)) {
                return res.status(400).json({ error: 'Status ID inválido.' });
            }

            const statusExiste = db.prepare('SELECT id FROM statuses WHERE id = ?').get(statusId);
            if (!statusExiste) {
                return res.status(400).json({ error: 'Status informado não existe.' });
            }

            const info = db.prepare('UPDATE agendamentos SET statusId = ? WHERE id = ?').run(statusId, id);
            if (info.changes > 0) {
                res.json({ message: 'Agendamento atualizado com sucesso' });
            } else {
                res.status(404).json({ error: 'Agendamento não encontrado' });
            }
        } catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar agendamento', details: error.message });
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

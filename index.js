import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database('vacinacao.db');

// Configurações
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// --- Tabelas do Banco de Dados ---
db.exec(`
    CREATE TABLE IF NOT EXISTS cidadaos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        telefone TEXT,
        email TEXT,
        endereco TEXT
    );

    CREATE TABLE IF NOT EXISTS vacinas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        fabricante TEXT NOT NULL,
        validade DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS postos_saude (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        endereco TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cidadaoId INTEGER NOT NULL,
        vacinaId INTEGER NOT NULL,
        postoId INTEGER NOT NULL,
        statusId INTEGER NOT NULL,
        dataHora DATETIME NOT NULL,
        FOREIGN KEY (cidadaoId) REFERENCES cidadaos(id) ON DELETE CASCADE,
        FOREIGN KEY (vacinaId) REFERENCES vacinas(id) ON DELETE CASCADE,
        FOREIGN KEY (postoId) REFERENCES postos_saude(id) ON DELETE CASCADE,
        FOREIGN KEY (statusId) REFERENCES statuses(id) ON DELETE CASCADE
    );
`);

// Insere dados iniciais se as tabelas estiverem vazias
const countCidadaos = db.prepare('SELECT COUNT(*) FROM cidadaos').get()['COUNT(*)'];
if (countCidadaos === 0) {
    db.prepare('INSERT INTO cidadaos (nome, cpf, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)').run('João Silva', '12345678901', '999998888', 'joao@email.com', 'Rua A, 123');
}

const countVacinas = db.prepare('SELECT COUNT(*) FROM vacinas').get()['COUNT(*)'];
if (countVacinas === 0) {
    db.prepare('INSERT INTO vacinas (nome, fabricante, validade) VALUES (?, ?, ?)').run('Vacina da Gripe', 'Butantan', '2026-12-31');
}

const countPostos = db.prepare('SELECT COUNT(*) FROM postos_saude').get()['COUNT(*)'];
if (countPostos === 0) {
    db.prepare('INSERT INTO postos_saude (nome, endereco) VALUES (?, ?)').run('Posto Central', 'Avenida Principal, 456');
}

const countStatuses = db.prepare('SELECT COUNT(*) FROM statuses').get()['COUNT(*)'];
if (countStatuses === 0) {
    db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run('Agendado');
    db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run('Realizado');
    db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run('Cancelado');
}

const cidadao = db.prepare('SELECT id FROM cidadaos LIMIT 1').get();
const vacina = db.prepare('SELECT id FROM vacinas LIMIT 1').get();
const posto = db.prepare('SELECT id FROM postos_saude LIMIT 1').get();
const status = db.prepare('SELECT id FROM statuses WHERE descricao = ?').get('Agendado');

if (cidadao && vacina && posto && status) {
    const countAgendamentos = db.prepare('SELECT COUNT(*) FROM agendamentos').get()['COUNT(*)'];
    if (countAgendamentos === 0) {
        db.prepare(`
            INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
            VALUES (?, ?, ?, ?, ?)
        `).run(cidadao.id, vacina.id, posto.id, status.id, '2025-09-01T10:00');
    }
}

// Rotas para Cidadãos
app.get('/cidadaos', (req, res) => {
    const cidadaos = db.prepare('SELECT * FROM cidadaos').all();
    res.json(cidadaos);
});

app.post('/cidadao', (req, res) => {
    try {
        const { nome, cpf, telefone, email, endereco } = req.body;
        const info = db.prepare('INSERT INTO cidadaos (nome, cpf, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)').run(nome, cpf, telefone, email, endereco);
        res.status(201).json({ message: 'Cidadão adicionado com sucesso', id: info.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao adicionar cidadão', details: error.message });
    }
});

app.put('/cidadao/:id', (req, res) => {
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

app.delete('/cidadao/:id', (req, res) => {
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

// Rotas para Vacinas
app.get('/vacinas', (req, res) => {
    const vacinas = db.prepare('SELECT * FROM vacinas').all();
    res.json(vacinas);
});

app.post('/vacina', (req, res) => {
    try {
        const { nome, fabricante, validade } = req.body;
        const info = db.prepare('INSERT INTO vacinas (nome, fabricante, validade) VALUES (?, ?, ?)').run(nome, fabricante, validade);
        res.status(201).json({ message: 'Vacina adicionada com sucesso', id: info.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao adicionar vacina', details: error.message });
    }
});

app.put('/vacina/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { nome, fabricante, validade } = req.body;
        const query = 'UPDATE vacinas SET nome = COALESCE(?, nome), fabricante = COALESCE(?, fabricante), validade = COALESCE(?, validade) WHERE id = ?';
        const info = db.prepare(query).run(nome || null, fabricante || null, validade || null, id);
        if (info.changes > 0) {
            res.json({ message: 'Vacina atualizada com sucesso' });
        } else {
            res.status(404).json({ error: 'Vacina não encontrada' });
        }
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar vacina', details: error.message });
    }
});

app.delete('/vacina/:id', (req, res) => {
    try {
        const { id } = req.params;
        const info = db.prepare('DELETE FROM vacinas WHERE id = ?').run(id);
        if (info.changes > 0) {
            res.json({ message: 'Vacina excluída com sucesso' });
        } else {
            res.status(404).json({ error: 'Vacina não encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir vacina', details: error.message });
    }
});

// Rotas para Postos de Saúde
app.get('/postos', (req, res) => {
    const postos = db.prepare('SELECT * FROM postos_saude').all();
    res.json(postos);
});

app.post('/posto', (req, res) => {
    try {
        const { nome, endereco } = req.body;
        const info = db.prepare('INSERT INTO postos_saude (nome, endereco) VALUES (?, ?)').run(nome, endereco);
        res.status(201).json({ message: 'Posto de saúde adicionado com sucesso', id: info.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao adicionar posto de saúde', details: error.message });
    }
});

app.put('/posto/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { nome, endereco } = req.body;
        const query = 'UPDATE postos_saude SET nome = COALESCE(?, nome), endereco = COALESCE(?, endereco) WHERE id = ?';
        const info = db.prepare(query).run(nome || null, endereco || null, id);
        if (info.changes > 0) {
            res.json({ message: 'Posto de saúde atualizado com sucesso' });
        } else {
            res.status(404).json({ error: 'Posto de saúde não encontrado' });
        }
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar posto de saúde', details: error.message });
    }
});

app.delete('/posto/:id', (req, res) => {
    try {
        const { id } = req.params;
        const info = db.prepare('DELETE FROM postos_saude WHERE id = ?').run(id);
        if (info.changes > 0) {
            res.json({ message: 'Posto de saúde excluído com sucesso' });
        } else {
            res.status(404).json({ error: 'Posto de saúde não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir posto de saúde', details: error.message });
    }
});

// Rotas para Status de Agendamento
app.get('/statuses', (req, res) => {
    const statuses = db.prepare('SELECT * FROM statuses').all();
    res.json(statuses);
});

app.post('/status', (req, res) => {
    try {
        const { descricao } = req.body;
        const info = db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run(descricao);
        res.status(201).json({ message: 'Status adicionado com sucesso', id: info.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao adicionar status', details: error.message });
    }
});

app.delete('/status/:id', (req, res) => {
    try {
        const { id } = req.params;
        const info = db.prepare('DELETE FROM statuses WHERE id = ?').run(id);
        if (info.changes > 0) {
            res.json({ message: 'Status excluído com sucesso' });
        } else {
            res.status(404).json({ error: 'Status não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir status', details: error.message });
    }
});

// Rotas para Agendamentos
app.get('/agendamentos', (req, res) => {
    const agendamentos = db.prepare('SELECT * FROM agendamentos').all();
    res.json(agendamentos);
});

app.post('/agendamento', (req, res) => {
    try {
        const { cidadaoId, vacinaId, postoId, statusId, dataHora } = req.body;
        const info = db.prepare('INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora) VALUES (?, ?, ?, ?, ?)').run(cidadaoId, vacinaId, postoId, statusId, dataHora);
        res.status(201).json({ message: 'Agendamento criado com sucesso', id: info.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao criar agendamento', details: error.message });
    }
});

app.put('/agendamento/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { statusId } = req.body;
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

app.delete('/agendamento/:id', (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
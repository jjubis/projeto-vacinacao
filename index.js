import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

import cidadaoRoutes from './routes/cidadaoRoutes.js';
import vacinaRoutes from './routes/vacinaRoutes.js';
import postoRoutes from './routes/postoRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import agendamentoRoutes from './routes/agendamentoRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database('vacinacao.db');

// Configurações
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conecta o banco de dados e cria as tabelas se não existirem
(function initializeDatabase() {
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
})();

// Rotas da API
app.use('/cidadaos', cidadaoRoutes(db));
app.use('/vacinas', vacinaRoutes(db));
app.use('/postos', postoRoutes(db));
app.use('/statuses', statusRoutes(db));
app.use('/agendamentos', agendamentoRoutes(db));

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
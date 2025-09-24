import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

import cidadaoRoutes from './routes/cidadaoRoutes.js';
import vacinaRoutes from './routes/vacinaRoutes.js';
import postoRoutes from './routes/postoRoutes.js';
import agendamentoRoutes from './routes/agendamentoRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database('vacinacao.db');

// Configurações
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile('vacinacao.html', { root: 'public' });
});

(function initializeDatabase() {
    console.log('Inicializando banco de dados...');
    
    // Criação das tabelas
    db.exec(`
        CREATE TABLE IF NOT EXISTS cidadaos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            telefone TEXT,
            email TEXT,
            endereco TEXT
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS vacinas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            fabricante TEXT NOT NULL,
            validade DATE NOT NULL
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS postos_saude (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            endereco TEXT NOT NULL
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT UNIQUE NOT NULL
        );
    `);

    db.exec(`
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

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS unique_agendamento ON agendamentos (cidadaoId, vacinaId) WHERE statusId IN (1, 2);
    `);
    
    // Insere dados iniciais se as tabelas estiverem vazias
    const countCidadaos = db.prepare('SELECT COUNT(*) AS count FROM cidadaos').get().count;
    if (countCidadaos === 0) {
        console.log('Inserindo cidadão inicial...');
        db.prepare('INSERT INTO cidadaos (nome, cpf, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)')
            .run('João Silva', '12345678901', '99999888888', 'joao@email.com', 'Rua A, 123');
    }

    const countVacinas = db.prepare('SELECT COUNT(*) AS count FROM vacinas').get().count;
    if (countVacinas === 0) {
        console.log('Inserindo vacina inicial...');
        db.prepare('INSERT INTO vacinas (nome, fabricante, validade) VALUES (?, ?, ?)')
            .run('Vacina da Gripe', 'Butantan', '2026-12-31');
    }

    const countPostos = db.prepare('SELECT COUNT(*) AS count FROM postos_saude').get().count;
    if (countPostos === 0) {
        console.log('Inserindo posto inicial...');
        db.prepare('INSERT INTO postos_saude (nome, endereco) VALUES (?, ?)')
            .run('Posto Central', 'Avenida Principal, 456');
    }

    const countStatuses = db.prepare('SELECT COUNT(*) AS count FROM statuses').get().count;
    if (countStatuses === 0) {
        console.log('Inserindo status iniciais...');
        db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run('Agendado');
        db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run('Realizado');
        db.prepare('INSERT INTO statuses (descricao) VALUES (?)').run('Cancelado');
    }

    const cidadao = db.prepare('SELECT id FROM cidadaos LIMIT 1').get();
    const vacina = db.prepare('SELECT id FROM vacinas LIMIT 1').get();
    const posto = db.prepare('SELECT id FROM postos_saude LIMIT 1').get();
    const status = db.prepare('SELECT id FROM statuses WHERE descricao = ?').get('Agendado');

    if (cidadao && vacina && posto && status) {
        const countAgendamentos = db.prepare('SELECT COUNT(*) AS count FROM agendamentos').get().count;
        if (countAgendamentos === 0) {
            console.log('Inserindo agendamento inicial...');
            db.prepare(`
                INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
                VALUES (?, ?, ?, ?, ?)
            `).run(cidadao.id, vacina.id, posto.id, status.id, '2025-09-01T10:00');
        }
    }

    console.log('Banco de dados inicializado.');
})();

app.get('/teste', (req, res) => {
    console.log('Rota /teste acessada');
    res.json({ message: 'Servidor está rodando e respondendo!' });
});

app.use('/cidadaos', (req, res, next) => {
    console.log(`Request para /cidadaos: ${req.method} ${req.url}`);
    next();
}, cidadaoRoutes(db));

app.use('/vacinas', (req, res, next) => {
    console.log(`Request para /vacinas: ${req.method} ${req.url}`);
    next();
}, vacinaRoutes(db));

app.use('/postos', (req, res, next) => {
    console.log(`Request para /postos: ${req.method} ${req.url}`);
    next();
}, postoRoutes(db));

app.use('/agendamentos', (req, res, next) => {
    console.log(`Request para /agendamentos: ${req.method} ${req.url}`);
    next();
}, agendamentoRoutes(db));

// Start do servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
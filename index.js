import express from 'express';
import { requireRole } from './utils/middlewares.js';
import cors from 'cors';
import Database from 'better-sqlite3'; 
import criarCidadaoRouter from './routes/cidadaoRoutes.js';
import criarVacinaRouter from './routes/vacinaRoutes.js';
import criarPostoRouter from './routes/postoRoutes.js';
import criarAgendamentoRouter from './routes/agendamentoRoutes.js';
import 'dotenv/config';
import session from 'express-session';
import criarAuthRouter from './routes/authRoutes.js';


const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database('vacinacao.db');

db.pragma('journal_mode = WAL');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // true somente quando estiver rodando com HTTPS em produção
        maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
}));

app.get('/', (req, res) => {
    res.sendFile('vacinacao.html', { root: 'public' }); 
});

app.get('/gestao/dados', requireRole('funcionario'), (req, res) => {
    try {
        const totalCidadaos = db.prepare('SELECT COUNT(*) AS total FROM cidadaos').get().total;
        const estoqueResult = db.prepare('SELECT SUM(quantidade) AS total FROM estoque').get();
        const totalVacinasEmEstoque = estoqueResult && estoqueResult.total ? estoqueResult.total : 0;
        const totalAgendamentos = db.prepare('SELECT COUNT(*) AS total FROM agendamentos').get().total;

        res.json({
            totalCidadaos,
            totalVacinasEmEstoque, 
            totalAgendamentos
        });

    } catch (error) {
        console.error('Erro ao buscar dados de gestão:', error);
        res.status(500).json({ error: error.message });
    }
});

//INICIALIZAÇÃO DO BANCO DE DADOS

(function initializeDatabase() {
    console.log('Inicializando banco de dados...');

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
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senhaHash TEXT NOT NULL,
        papel TEXT NOT NULL CHECK (papel IN ('cidadao', 'funcionario')),
        cidadaoId INTEGER,
        criadoEm DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cidadaoId) REFERENCES cidadaos(id) ON DELETE CASCADE
    );
`);

    db.exec(`
        CREATE TABLE IF NOT EXISTS statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT UNIQUE NOT NULL
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS estoque (
            postoId INTEGER NOT NULL,
            vacinaId INTEGER NOT NULL,
            quantidade INTEGER NOT NULL,
            PRIMARY KEY (postoId, vacinaId),
            FOREIGN KEY (postoId) REFERENCES postos_saude(id) ON DELETE CASCADE, 
            FOREIGN KEY (vacinaId) REFERENCES vacinas(id) ON DELETE CASCADE   
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
            FOREIGN KEY (statusId) REFERENCES statuses(id),
            UNIQUE (cidadaoId, vacinaId) 
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS historico_vacinal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cidadaoId INTEGER NOT NULL,
            vacinaId INTEGER NOT NULL,
            dataAplicacao DATETIME NOT NULL,
            agendamentoId INTEGER UNIQUE NOT NULL,
            FOREIGN KEY (cidadaoId) REFERENCES cidadaos(id) ON DELETE CASCADE,
            FOREIGN KEY (vacinaId) REFERENCES vacinas(id) ON DELETE CASCADE,
            FOREIGN KEY (agendamentoId) REFERENCES agendamentos(id) ON DELETE CASCADE
        );
    `);
    

    const statusCount = db.prepare('SELECT COUNT(*) AS c FROM statuses').get().c;
    if (statusCount === 0) {
        db.prepare("INSERT INTO statuses (descricao) VALUES ('Agendado')").run();  
        db.prepare("INSERT INTO statuses (descricao) VALUES ('Realizado')").run(); 
        db.prepare("INSERT INTO statuses (descricao) VALUES ('Cancelado')").run(); 
    }
    
    const cidadaoCount = db.prepare('SELECT COUNT(*) AS c FROM cidadaos').get().c;
    if (cidadaoCount === 0) {
        db.prepare(`INSERT INTO cidadaos (nome, cpf, telefone, email, endereco) VALUES ('João Silva', '12345678901', '999988888', 'joao@email.com', 'Rua A, 123')`).run();
    }
    
    const vacinaCount = db.prepare('SELECT COUNT(*) AS c FROM vacinas').get().c;
    if (vacinaCount === 0) {
        db.prepare(`INSERT INTO vacinas (nome, fabricante, validade) VALUES ('Vacina da Gripe', 'Butantan', '2026-12-31')`).run();
    }

    const postoCount = db.prepare('SELECT COUNT(*) AS c FROM postos_saude').get().c;
    if (postoCount === 0) {
        db.prepare(`INSERT INTO postos_saude (nome, endereco) VALUES ('UBS Aterrado', 'Rua Domingos dos Santos, 105, no bairro Aterrado, em Mogi Mirim - SP')`).run();
    }
    
    const estoqueCount = db.prepare('SELECT COUNT(*) AS c FROM estoque').get().c;
    if (estoqueCount === 0) {
        const vac = db.prepare('SELECT id FROM vacinas LIMIT 1').get();
        const pos = db.prepare('SELECT id FROM postos_saude LIMIT 1').get();
        
        if (vac && pos) {
             console.log("Criando estoque inicial (10 doses) para o Posto 1 / Vacina 1...");
             db.prepare("INSERT INTO estoque (postoId, vacinaId, quantidade) VALUES (?, ?, 10)").run(pos.id, vac.id);
        }
    }

    const agendamentoCount = db.prepare('SELECT COUNT(*) AS c FROM agendamentos').get().c;
    if (agendamentoCount === 0) {
        const cid = db.prepare('SELECT id FROM cidadaos LIMIT 1').get();
        const vac = db.prepare('SELECT id FROM vacinas LIMIT 1').get();
        const pos = db.prepare('SELECT id FROM postos_saude LIMIT 1').get();
        const sts = 1; 

        if (cid && vac && pos) {
            db.prepare(`
                INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
                VALUES (?, ?, ?, ?, ?)
            `).run(cid.id, vac.id, pos.id, sts, '2025-09-01T10:00');
        }
    }

    console.log("Banco de dados pronto!");
})();

app.use('/cidadaos', criarCidadaoRouter(db));
app.use('/vacinas', criarVacinaRouter(db));
app.use('/postos', criarPostoRouter(db));
app.use('/agendamentos', criarAgendamentoRouter(db));
app.use('/auth', criarAuthRouter(db));

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
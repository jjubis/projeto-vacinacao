// index.js (CÓDIGO FINAL, Sem statusRoutes)

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3'; 

// Rotas: Usamos import para o padrão ES Modules
import criarCidadaoRouter from './routes/cidadaoRoutes.js';
import criarVacinaRouter from './routes/vacinaRoutes.js';
import criarPostoRouter from './routes/postoRoutes.js';
import criarAgendamentoRouter from './routes/agendamentoRoutes.js';
// A ROTA STATUS NÃO ESTÁ MAIS AQUI!

const app = express();
const PORT = process.env.PORT || 3000;

// Banco de dados
const db = new Database('vacinacao.db');
db.pragma('journal_mode = WAL');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Página inicial
app.get('/', (req, res) => {
    res.sendFile('vacinacao.html', { root: 'public' }); 
});

/*
==========================================================
 📊 ROTA DO GRÁFICO — TOTAL DE VACINAS EM ESTOQUE GLOBAL
==========================================================
*/
app.get('/gestao/dados', (req, res) => {
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


/*
==========================================================
 📌 INICIALIZAÇÃO DO BANCO DE DADOS (COM ON DELETE CASCADE)
==========================================================
*/
(function initializeDatabase() {
    console.log('Inicializando banco de dados...');

    // As criações de tabela (com ON DELETE CASCADE) permanecem inalteradas
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

    /* ESTOQUE POR POSTO E VACINA (COM ON DELETE CASCADE) */
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

    // AGENDAMENTOS (COM ON DELETE CASCADE)
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

    // HISTORICO VACINAL (COM ON DELETE CASCADE)
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
    
    // --- INSERÇÕES INICIAIS ---
    
    // STATUS
    const statusCount = db.prepare('SELECT COUNT(*) AS c FROM statuses').get().c;
    if (statusCount === 0) {
        db.prepare("INSERT INTO statuses (descricao) VALUES ('Agendado')").run();     // 1
        db.prepare("INSERT INTO statuses (descricao) VALUES ('Realizado')").run();    // 2
        db.prepare("INSERT INTO statuses (descricao) VALUES ('Cancelado')").run();    // 3
    }
    
    // ... O resto das inserções iniciais (cidadaos, vacinas, postos, estoque, agendamentos) ...
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
        db.prepare(`INSERT INTO postos_saude (nome, endereco) VALUES ('Posto Central', 'Avenida Principal, 456')`).run();
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
        const sts = 1; // Agendado

        if (cid && vac && pos) {
            db.prepare(`
                INSERT INTO agendamentos (cidadaoId, vacinaId, postoId, statusId, dataHora)
                VALUES (?, ?, ?, ?, ?)
            `).run(cid.id, vac.id, pos.id, sts, '2025-09-01T10:00');
        }
    }

    console.log("Banco de dados pronto!");
})();


/*
==========================================================
 🔗 ROTAS
==========================================================
*/
app.use('/cidadaos', criarCidadaoRouter(db));
app.use('/vacinas', criarVacinaRouter(db));
app.use('/postos', criarPostoRouter(db));
app.use('/agendamentos', criarAgendamentoRouter(db));
// A rota /status não está mais aqui.


// Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
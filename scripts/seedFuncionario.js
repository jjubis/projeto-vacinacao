import Database from 'better-sqlite3';
import 'dotenv/config';
import { hashSenha } from '../utils/auth.js';

const db = new Database('vacinacao.db');

async function seedFuncionario() {
    const nome = 'Administrador';
    const email = 'admin@imunizamais.com';
    const senha = 'TrocarSenha123';

    const jaExiste = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (jaExiste) {
        console.log('⚠️  Já existe um usuário com esse email. Nada foi criado.');
        db.close();
        return;
    }

    const senhaHash = await hashSenha(senha);

    const info = db.prepare(`
        INSERT INTO usuarios (nome, email, senhaHash, papel, cidadaoId)
        VALUES (?, ?, ?, 'funcionario', NULL)
    `).run(nome, email, senhaHash);

    console.log(`✅ Funcionário criado com sucesso! ID: ${info.lastInsertRowid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${senha}`);

    db.close();
}

seedFuncionario();
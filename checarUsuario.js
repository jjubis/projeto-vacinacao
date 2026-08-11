import Database from 'better-sqlite3';

const db = new Database('vacinacao.db');
const usuarios = db.prepare('SELECT id, nome, email, papel, cidadaoId FROM usuarios').all();
console.log(usuarios);
db.close();
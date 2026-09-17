import Database from 'better-sqlite3';
import { DATABASE_PATH } from './utils/databasePath.js';

const db = new Database(DATABASE_PATH);
const usuarios = db.prepare('SELECT id, nome, email, papel, cidadaoId FROM usuarios').all();
console.log(usuarios);
db.close();

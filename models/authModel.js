import { pool } from "../config/database.js";

const findByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
};

const findByCpf = async (cpf) => {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
    return rows[0];
};

const create = async ({ nome, cpf, email, senha_hash, papel }) => {
    const [result] = await pool.query(
        'INSERT INTO usuarios (nome, cpf, email, senha_hash, papel) VALUES (?, ?, ?, ?, ?)',
        [nome, cpf, email, senha_hash, papel]
    );
    return result.insertId;
};

export default {
    findByEmail,
    findByCpf,
    create
};
import { pool } from "../config/database.js";

const findByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
};

const findByCpf = async (cpf) => {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
    return rows[0];
};

const findByCpfWith = async (cpf, connection) => {
    const db = connection || pool;
    const [rows] = await db.query('SELECT * FROM usuarios WHERE cpf = ? FOR UPDATE', [cpf]);
    return rows[0];
};

const activateCitizen = async (id, senhaHash, connection) => {
    const db = connection || pool;
    await db.query("UPDATE usuarios SET senha_hash = ? WHERE id = ? AND papel = 'cidadao'", [senhaHash, id]);
};

// const create = async ({ nome, cpf, email, senha_hash, papel }) => {
//     const [result] = await pool.query(
//         'INSERT INTO usuarios (nome, cpf, email, senha_hash, papel) VALUES (?, ?, ?, ?, ?)',
//         [nome, cpf, email, senha_hash, papel]
//     );
//     return result.insertId;
// };

const create = async (dadosUsuario, connection) => {
    const db = connection || pool;

    // Insere no banco de dados de LOGIN/AUTENTICAÇÃO
    const [result] = await db.query(
        `INSERT INTO usuarios (nome, cpf, email, senha_hash, papel, paciente_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            dadosUsuario.nome,
            dadosUsuario.cpf,
            dadosUsuario.email,
            dadosUsuario.senha_hash,
            dadosUsuario.papel,
            dadosUsuario.paciente_id || null
        ]
    );

    return result.insertId;
};

export default {
    findByEmail,
    findByCpf,
    findByCpfWith,
    activateCitizen,
    create
};

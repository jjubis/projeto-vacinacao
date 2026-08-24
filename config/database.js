import 'dotenv/config';
import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testa a conexão ao iniciar o servidor. Se falhar, encerra o processo
// para evitar que a aplicação rode sem acesso ao banco.
export const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Conexão com o banco de dados MySQL estabelecida com sucesso.');
        connection.release();
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados MySQL:', error);
        process.exit(1);
    }
};

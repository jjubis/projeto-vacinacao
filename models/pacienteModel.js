import { pool } from "../config/database.js";

const create = async (dadosPaciente, connection) => {
  // Usa a conexão da transação se ela existir, senão usa o pool normal
  const db = connection || pool;
  const [result] = await db.query(
    `INSERT INTO pacientes (nome, cpf, email, data_nascimento, telefone) VALUES (?, ?, ?, ?, ?)`,
    [dadosPaciente.nome, dadosPaciente.cpf, dadosPaciente.email, dadosPaciente.data_nascimento, dadosPaciente.telefone || null]
  );
  return result.insertId;
};

export default {
  tableName: 'pacientes',
  columns: ['id', 'nome', 'cpf', 'data_nascimento', 'telefone', 'email', 'created_at', 'updated_at'],
  create
};

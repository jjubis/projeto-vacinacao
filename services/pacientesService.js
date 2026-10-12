import { pool } from "../config/database.js";
import { cpfEhValido, emailEhValido, telefoneEhValido } from "../utils/validarDados.js";

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM pacientes ORDER BY nome');
  return {
    total: rows.length,
    pacientes: rows,
  };
};

const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
  return rows[0];
};

const create = async (data) => {
  try {
    // const { nome, cpf, data_nascimento, telefone, email } = data;
    const {
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      ...outrosDados
    } = data;

    if (!nome || !cpf || !data_nascimento || !logradouro || !numero || !bairro || !cidade || !uf || !cep) {
      throw new Error('Todos os campos obrigatórios devem ser preenchidos.');
    }

    if (!cpfEhValido(cpf)) {
      return res.status(400).json({ error: "CPF inválido. Deve conter exetamente 11 dígitos numéricos." })
    }

    if (!telefoneEhValido(telefone)) {
      return res.status(400).json({ error: "Telefone inválido. Deve conter 10 ou 11 dígitos numéricos." })
    }

    email = email.trim().toLowerCase();
    if (!emailEhValido(email)) {
      return res.status(400).json({ error: "Email inválido. Deve conter um formato válido." })
    }

    const complementoTexto = complemento ? `, ${complemento}` : '';
    const enderecoCompleto = `${logradouro}, ${numero}${complementoTexto}, ${bairro}, ${cidade} - ${uf}, ${cep}`;

    console.log('Endereço completo:', enderecoCompleto);

    const [existing] = await pool.query('SELECT * FROM pacientes WHERE cpf = ?', [outrosDados.cpf]);
    if (existing.length > 0) {
      throw new Error('Paciente com este CPF já cadastrado.');
    }

    const [result] = await pool.query(
      'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email, endereco) VALUES (?, ?, ?, ?, ?, ?)',
      [outrosDados.nome, outrosDados.cpf, outrosDados.data_nascimento, outrosDados.telefone || null, outrosDados.email || null, enderecoCompleto]
    );

    const id = getById(result.insertId);

    console.log('Paciente cadastrado com sucesso:', id);

    return getById(result.insertId);
  } catch (error) {
    console.error('Erro ao cadastrar paciente:', error.message);

    if (error.message.includes('já cadastrado')) {
      return res.status(409).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Erro ao cadastrar paciente.',
      details: error.message,
    })
  }
};

const update = async (id, data) => {
  try {
    // const { nome, cpf, data_nascimento, telefone, email } = data;
    const {
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      ...outrosDados
    } = data;

    if (!cpfEhValido(cpf)) {
      return res.status(400).json({ error: "CPF inválido. Deve conter exetamente 11 dígitos numéricos." })
    }

    if (!telefoneEhValido(telefone)) {
      return res.status(400).json({ error: "Telefone inválido. Deve conter 10 ou 11 dígitos numéricos." })
    }

    email = email.trim().toLowerCase();
    if (!emailEhValido(email)) {
      return res.status(400).json({ error: "Email inválido. Deve conter um formato válido." })
    }

    const complementoTexto = complemento ? `, ${complemento}` : '';
    const enderecoCompleto = `${logradouro}, ${numero}${complementoTexto}, ${bairro}, ${cidade} - ${uf}, ${cep}`;

    const [existing] = await pool.query('SELECT * FROM pacientes WHERE cpf = ?', [outrosDados.cpf]);
    if (existing.length > 0) {
      throw new Error('Paciente com este CPF já cadastrado.');
    }

    await pool.query(
      'UPDATE pacientes SET nome = ?, cpf = ?, data_nascimento = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?',
      [outrosDados.nome, outrosDados.cpf, outrosDados.data_nascimento, outrosDados.telefone || null, outrosDados.email || null, enderecoCompleto, id]
    );

    return getById(id);
  } catch (error) {
    console.error('Erro ao atualizar cidadão:', error);
    res.status(400).json({
      error: 'Erro ao atualizar cidadão',
      details: error.message
    });
  }
};

const remove = async (id) => {
  await pool.query('DELETE FROM pacientes WHERE id = ?', [id]);
};

export default { getAll, getById, create, update, remove };

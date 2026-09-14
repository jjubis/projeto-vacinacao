import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import authModel from '../models/authModel.js';
import pacienteModel from '../models/pacienteModel.js';
import { pool } from "../config/database.js";

// const register = async (userData) => {
//     const { nome, cpf, email, senha, papel = 'cidadao' } = userData;

//     const senha_hash = await bcrypt.hash(senha, 10);

//     let pacienteId = null;
//     if (papel === 'cidadao') {
//         pacienteId = await pacienteModel.create({ nome, cpf, email });
//     }

//     const userId = await authModel.create({
//         nome,
//         cpf,
//         email,
//         senha_hash,
//         papel,
//         paciente_id: pacienteId
//     });

//     return { id: userId, nome, email, papel, paciente_id: pacienteId };
// };

const register = async (userData) => {
    // 1. Extrai data_nascimento do objeto enviado pelo front-end
    const { nome, cpf, email, senha, dataNascimento: data_nascimento, telefone, papel = 'cidadao' } = userData;

    console.log("Data nascimento extraída do front-end:", data_nascimento);

    const senha_hash = await bcrypt.hash(senha, 10);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        let pacienteId = null;

        if (papel === 'cidadao') {
            // 2. Repassa data_nascimento para o pacienteModel
            pacienteId = await pacienteModel.create(
                {
                    nome,
                    cpf,
                    email,
                    data_nascimento,
                    telefone
                },
                connection
            );
        }

        const userId = await authModel.create(
            { nome, cpf, email, senha_hash, papel, paciente_id: pacienteId },
            connection
        );

        await connection.commit();
        return { id: userId, nome, email, papel, paciente_id: pacienteId };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const login = async (email, senha) => {
    const usuario = await authModel.findByEmail(email);
    console.log("Usuário retornado do banco:", usuario)

    if (!usuario) {
        throw new Error('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(senha, usuario.senha_hash);
    if (!isPasswordValid) {
        throw new Error('Credenciais inválidas');
    }

    const secretKey = process.env.JWT_SECRET;

    const token = jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            papel: usuario.papel,
            paciente_id: usuario.paciente_id
        },
        secretKey,
        { expiresIn: '1d' }
    );

    return {
        token,
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            papel: usuario.papel,
            paciente_id: usuario.paciente_id
        }
    };
};

export default {
    register,
    login
};
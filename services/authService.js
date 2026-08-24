import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import authModel from '../models/authModel.js';

const register = async (userData) => {
    const { nome, cpf, email, senha, papel = 'cidadao' } = userData;

    const senha_hash = await bcrypt.hash(senha, 10);

    let pacienteId = null;
    if (papel === 'cidadao') {
        pacienteId = await pacienteModel.create({ nome, cpf, email });
    }

    const userId = await authModel.create({
        nome,
        cpf,
        email,
        senha_hash,
        papel,
        paciente_id: pacienteId
    });

    return { id: userId, nome, email, papel, paciente_id: pacienteId };
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
            papel: usuario.papel
        }
    };
};

export default {
    register,
    login
};
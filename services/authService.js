import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authModel from '../models/authModel.js';
import { pool } from '../config/database.js';

const erro = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const limparCpf = cpf => String(cpf || '').replace(/\D/g, '');
const emailNormalizado = email => String(email || '').trim().toLowerCase();
const nomeNormalizado = nome => String(nome || '').trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase('pt-BR');
const capitalizarNome = nome => {
    const particulas = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
    return String(nome || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ')
        .map((palavra, indice) => indice > 0 && particulas.has(palavra) ? palavra
            : palavra.split(/([-'])/).map(parte => parte === '-' || parte === "'" || !parte
                ? parte : parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1)).join(''))
        .join(' ');
};

const register = async (userData) => {
    const { senha } = userData;
    const nome = capitalizarNome(userData.nome);
    const cpf = limparCpf(userData.cpf);
    const email = emailNormalizado(userData.email);
    if (!/^\d{11}$/.test(cpf)) throw erro(400, 'CPF deve conter exatamente 11 números.');
    const papel = userData.papel || 'cidadao';

    if (!nome?.trim() || !cpf || !email || !senha) throw erro(400, 'Nome, CPF, email e senha são obrigatórios.');
    if (senha.length < 8) throw erro(400, 'A senha deve ter no mínimo 8 caracteres.');
    if (!['cidadao', 'funcionario'].includes(papel)) throw erro(400, 'Papel de usuário inválido.');

    const senha_hash = await bcrypt.hash(senha, 10);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let pacienteId = null;

        if (papel === 'cidadao') {
            const [pacientes] = await connection.query('SELECT * FROM pacientes WHERE cpf = ? FOR UPDATE', [cpf]);
            const paciente = pacientes[0];
            if (!paciente) throw erro(404, 'Não encontramos um cidadão cadastrado com este CPF. Procure um funcionário para fazer o cadastro.');
            if (emailNormalizado(paciente.email) !== email || nomeNormalizado(paciente.nome) !== nomeNormalizado(nome)) {
                throw erro(403, 'Nome e email devem corresponder ao cadastro feito pelo funcionário.');
            }
            pacienteId = paciente.id;

            const existente = await authModel.findByCpfWith(cpf, connection);
            if (existente) {
                if (Number(existente.ativo) === 0) throw erro(403, 'Este cadastro estÃ¡ inativado. Procure um funcionÃ¡rio para solicitar a reativaÃ§Ã£o.');
                if (existente.papel !== 'cidadao' || Number(existente.paciente_id) !== Number(pacienteId) || emailNormalizado(existente.email) !== email) {
                    throw erro(409, 'Este CPF já está associado a outra conta.');
                }
                if (existente.senha_hash !== 'PENDING_ACTIVATION') {
                    throw erro(409, 'Este cidadão já possui acesso. Use a recuperação de senha para redefinir a senha.');
                }
                await authModel.activateCitizen(existente.id, senha_hash, connection);
                await connection.commit();
                return { id: existente.id, nome: existente.nome, email: existente.email, papel: existente.papel, paciente_id: pacienteId };
            }
        }

        const userId = await authModel.create(
            { nome: nome.trim(), cpf, email, senha_hash, papel, paciente_id: pacienteId },
            connection
        );
        await connection.commit();
        return { id: userId, nome: nome.trim(), email, papel, paciente_id: pacienteId };
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') throw erro(409, 'CPF ou email já cadastrado.');
        throw error;
    } finally {
        connection.release();
    }
};

const login = async (email, senha) => {
    const usuario = await authModel.findByEmail(emailNormalizado(email));
    if (usuario && Number(usuario.ativo) === 0) throw erro(403, 'Esta conta foi inativada. Procure um funcionÃ¡rio para obter ajuda.');
    if (!usuario || usuario.senha_hash === 'PENDING_ACTIVATION' || !(await bcrypt.compare(senha, usuario.senha_hash))) {
        throw erro(401, 'Credenciais inválidas.');
    }
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) throw new Error('JWT_SECRET não configurado.');
    if (usuario.papel === 'cidadao' && !usuario.paciente_id) {
        throw erro(403, 'Esta conta não está associada a um cidadão. Procure um funcionário.');
    }

    const token = jwt.sign({
        id: usuario.id,
        email: usuario.email,
        papel: usuario.papel,
        paciente_id: usuario.paciente_id
    }, secretKey, { expiresIn: '1d' });

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

const resetarSenha = async (emailData, novaSenha) => {
    const email = emailNormalizado(emailData);

    if (!email || !novaSenha) throw erro(400, 'Email e nova senha são obrigatórios.');
    if (novaSenha.length < 8) throw erro(400, 'A senha deve ter no mínimo 8 caracteres.');

    const usuario = await authModel.findByEmail(email);
    if (!usuario) {
        throw erro(404, 'E-mail não encontrado no sistema.');
    }

    if (Number(usuario.ativo) === 0) {
        throw erro(403, 'Esta conta está inativada');
    }

    const senha_hash = await bcrypt.hash(novaSenha, 10);

    await pool.query(
        'UPDATE usuarios SET senha_hash = ? WHERE email = ?',
        [senha_hash, email]
    );

    return { message: 'Senha redefinida com sucesso.' };
}

export default { register, login, resetarSenha };

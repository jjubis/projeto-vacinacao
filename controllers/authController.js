import { pool } from '../config/database.js';
import authService from '../services/authService.js'

const registerCidadao = async (req, res, next) => {
    try {
        const usuario = await authService.register({ ...req.body, papel: 'cidadao' });

        res.status(201).json({
            success: true,
            message: 'Usuário cadastrado com sucesso',
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

const registerFuncionario = async (req, res, next) => {
    try {
        const usuario = await authService.register({ ...req.body, papel: 'funcionario' });

        res.status(201).json({
            success: true,
            message: 'Funcionário cadastrado com sucesso',
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, senha } = req.body;
        const result = await authService.login(email, senha);

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: result
        });
    } catch (error) {
        next(error);
        console.log("Erro: ", error)
    }
};

const listarFuncionarios = async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            "SELECT id, nome, email, cpf, papel FROM usuarios WHERE papel = 'funcionario'"
        );

        return res.json({
            success: true,
            data: usuarios
        });
    } catch (error) {
        console.error("Erro ao buscar funcionário:", error);
        return res.status(500).json({ message: "Erro ao buscar funcionários." })
    }
}

export default {
    registerCidadao,
    registerFuncionario,
    login,
    listarFuncionarios
};
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

export default {
    registerCidadao,
    registerFuncionario,
    login
};
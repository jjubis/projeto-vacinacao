const validateBody = (camposObrigatorios) => (req, res, next) => {
    const ausentes = camposObrigatorios.filter((campo) => {
        const valor = req.body[campo];
        return valor === undefined || valor === null || valor === '';
    });

    if (ausentes.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Campo(s) obrigatório(s) não informado(s): ${ausentes.join(', ')}`
        });
    }

    next();
};

export default validateBody 
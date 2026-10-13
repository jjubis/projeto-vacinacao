import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Token de acesso não fornecido." });
    }

    const [, token] = authHeader.split(' ');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Atribui o payload decodificado para req.usuario (ou req.user)
        req.usuario = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
}

export function requireRole(...papeisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        // Compatibilidade para ler o papel tanto se vier direto quanto se vier dentro de uma propriedade 'usuario'
        const papelUsuario = req.usuario.papel || req.usuario.cargo || req.usuario.usuario?.papel;

        if (!papeisPermitidos.includes(papelUsuario)) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
        }

        next();
    };
}
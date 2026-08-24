import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Token de acesso não fornecido." });
    }

    const [, token] = authHeader.split(' ');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
}

export function requireRole(...papeisPermitidos) {
    return (req, res, next) => {
        if (!req.session.usuario) {
            return res.status(401).json({ error: 'É necessário estar logado para acessar este recurso.' });
        }
        if (!papeisPermitidos.includes(req.session.usuario.papel)) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
        }
        next();
    };
}
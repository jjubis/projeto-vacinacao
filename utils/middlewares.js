export function requireAuth(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'É necessário estar logado para acessar este recurso.' });
    }
    next();
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
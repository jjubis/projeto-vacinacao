import jwt from 'jsonwebtoken';
import authModel from '../models/authModel.js';

export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token de acesso não fornecido.' });
    }

    const correspondencia = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!correspondencia) {
        return res.status(401).json({ error: 'Formato do token inválido.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(correspondencia[1], process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    if (!decoded?.id) {
        return res.status(401).json({ error: 'Token sem identidade de usuário.' });
    }

    try {
        const usuario = await authModel.findById(decoded.id);
        if (!usuario) {
            return res.status(401).json({ error: 'A conta deste token não está mais ativa.' });
        }
        if (usuario.papel === 'cidadao' && !usuario.paciente_id) {
            return res.status(403).json({ error: 'Esta conta não está associada a um cidadão.' });
        }

        // Papel e vínculo atuais do banco prevalecem sobre as claims antigas do JWT.
        req.usuario = usuario;
        return next();
    } catch (error) {
        return next(error);
    }
}

export function requireRole(...papeisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }
        if (!papeisPermitidos.includes(req.usuario.papel)) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
        }
        return next();
    };
}

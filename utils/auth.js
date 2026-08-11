import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashSenha(senhaTextoPuro) {
    return bcrypt.hash(senhaTextoPuro, SALT_ROUNDS);
}

export async function verificarSenha(senhaTextoPuro, senhaHash) {
    return bcrypt.compare(senhaTextoPuro, senhaHash);
}
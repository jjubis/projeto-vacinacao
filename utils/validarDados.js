export function cpfEhValido(cpf) {
    const cpfLimpo = cpf.replace(/\D/g, '');

    return /^\d{11}$/.test(cpfLimpo);
}

export function telefoneEhValido(telefone) {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    return /^\d{10,11}$/.test(telefoneLimpo);
}

export function emailEhValido(email) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
        return false;
    }

    if (email.includes(' ')) {
        return false;
    }

    const [, domain] = email.split('@');
    if (!domain || !domain.includes('.')) {
        return false;
    }

    return true;
}
let usuarioLogado = null;

async function verificarSessao() {
    try {
        const resposta = await fazerRequisicao('/auth/me');
        usuarioLogado = resposta.usuario;
        return true;
    } catch (erro) {
        usuarioLogado = null;
        return false;
    }
}

async function fazerLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;

    if (!email || !senha) {
        mostrarMensagem('mensagemLogin', 'Preencha email e senha.', 'error');
        return;
    }

    try {
        const resposta = await fazerRequisicao('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });

        usuarioLogado = resposta.usuario;
        mostrarMensagem('mensagemLogin', 'Login realizado com sucesso!', 'success');

        setTimeout(() => {
            iniciarApp();
        }, 500);

    } catch (erro) {
        mostrarMensagem('mensagemLogin', erro.message, 'error');
    }
}

async function fazerRegistroCidadao(e) {
    e.preventDefault();

    const nome = document.getElementById('registroNome').value.trim();
    const cpf = document.getElementById('registroCpf').value.trim();
    const email = document.getElementById('registroEmail').value.trim();
    const senha = document.getElementById('registroSenha').value;
    const confirmarSenha = document.getElementById('registroConfirmarSenha').value;

    if (!nome || !cpf || !email || !senha || !confirmarSenha) {
        mostrarMensagem('mensagemRegistro', 'Preencha todos os campos.', 'error');
        return;
    }

    if (senha.length < 8) {
        mostrarMensagem('mensagemRegistro', 'A senha deve ter no mínimo 8 caracteres.', 'error');
        return;
    }

    if (senha !== confirmarSenha) {
        mostrarMensagem('mensagemRegistro', 'As senhas não coincidem.', 'error');
        return;
    }

    const submitButton = document.getElementById('registroSbmt');
    submitButton.disabled = true;
    submitButton.textContent = 'Criando acesso...';

    try {
        await fazerRequisicao('/auth/registrar', {
            method: 'POST',
            body: JSON.stringify({ nome, cpf, email, senha })
        });

        mostrarMensagem('mensagemRegistro', 'Acesso criado com sucesso! Redirecionando para o login...', 'success');
        document.getElementById('registroForm').reset();

        setTimeout(() => {
            mostrarTelaLogin();
        }, 1500);

    } catch (erro) {
        mostrarMensagem('mensagemRegistro', erro.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Criar acesso';
    }
}

async function fazerLogout() {
    try {
        await fazerRequisicao('/auth/logout', { method: 'POST' });
    } catch (erro) {
        console.warn('Erro ao fazer logout:', erro.message);
    } finally {
        usuarioLogado = null;
        location.reload();
    }
}

function mostrarTelaLogin() {
    document.getElementById('telaLogin').style.display = 'flex';
    document.getElementById('telaRegistro').style.display = 'none';
    document.getElementById('appContainer').style.display = 'none';
}

function mostrarTelaRegistro() {
    document.getElementById('telaLogin').style.display = 'none';
    document.getElementById('telaRegistro').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('telaLogin').style.display = 'none';
    document.getElementById('telaRegistro').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    const nomeUsuarioEl = document.getElementById('nomeUsuarioLogado');
    if (nomeUsuarioEl && usuarioLogado) {
        nomeUsuarioEl.textContent = `${usuarioLogado.nome} (${usuarioLogado.papel === 'funcionario' ? 'Profissional' : 'Cidadão'})`;
    }
}

window.verificarSessao = verificarSessao;
window.fazerLogin = fazerLogin;
window.fazerRegistroCidadao = fazerRegistroCidadao;
window.fazerLogout = fazerLogout;
window.mostrarTelaLogin = mostrarTelaLogin;
window.mostrarTelaRegistro = mostrarTelaRegistro;
window.mostrarApp = mostrarApp;
window.usuarioLogado = usuarioLogado;
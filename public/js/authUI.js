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
    document.getElementById('appContainer').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('telaLogin').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    const nomeUsuarioEl = document.getElementById('nomeUsuarioLogado');
    if (nomeUsuarioEl && usuarioLogado) {
        nomeUsuarioEl.textContent = `${usuarioLogado.nome} (${usuarioLogado.papel === 'funcionario' ? 'Profissional' : 'Cidadão'})`;
    }
}

window.verificarSessao = verificarSessao;
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.mostrarTelaLogin = mostrarTelaLogin;
window.mostrarApp = mostrarApp;
window.usuarioLogado = usuarioLogado;
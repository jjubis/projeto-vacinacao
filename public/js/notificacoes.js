function atualizarContadorNotificacoes() {
    const contador = document.getElementById('contadorNotificacoes');
    if (!contador || !sessionStorage.getItem('imuniza_token')) return;
    fazerRequisicao('/notificacoes/nao-lidas/contagem')
        .then(resposta => { contador.textContent = resposta.total || 0; })
        .catch(erro => console.warn('Não foi possível atualizar notificações:', erro.message));
}

async function carregarNotificacoes() {
    const lista = document.getElementById('listaNotificacoes');
    if (!lista) return;
    lista.replaceChildren();
    const filtro = document.getElementById('filtroCategoriaNotificacoes');
    if (filtro) {
        const filtroPermitido = usuarioLogado?.papel === 'funcionario';
        filtro.hidden = !filtroPermitido;
        document.querySelector('label[for="filtroCategoriaNotificacoes"]').hidden = !filtroPermitido;
    }
    const categoria = usuarioLogado?.papel === 'funcionario'
        ? filtro?.value : '';
    const query = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    try {
        const resposta = await fazerRequisicao(`/notificacoes${query}`);
        const notificacoes = resposta.data || [];
        if (!notificacoes.length) {
            lista.textContent = 'Nenhuma notificação encontrada.';
            return;
        }
        notificacoes.forEach(notificacao => {
            const cartao = document.createElement('article');
            cartao.className = `notification-item${notificacao.lida_em ? '' : ' unread'}`;
            const titulo = document.createElement('h4');
            titulo.textContent = notificacao.titulo;
            const mensagem = document.createElement('p');
            mensagem.textContent = notificacao.mensagem;
            const meta = document.createElement('p');
            meta.className = 'notification-meta';
            const data = new Date(notificacao.criada_em);
            meta.textContent = `${notificacao.categoria} · ${Number.isNaN(data.getTime()) ? notificacao.criada_em : data.toLocaleString('pt-BR')} · ${notificacao.lida_em ? 'Lida' : 'Não lida'}`;
            cartao.append(titulo, mensagem, meta);
            if (!notificacao.lida_em) {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.textContent = 'Marcar como lida';
                botao.addEventListener('click', async () => {
                    await fazerRequisicao(`/notificacoes/${notificacao.id}/lida`, { method: 'PATCH' });
                    await carregarNotificacoes();
                    atualizarContadorNotificacoes();
                });
                cartao.append(botao);
            }
            lista.append(cartao);
        });
    } catch (erro) {
        lista.textContent = `Erro ao carregar notificações: ${erro.message}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const categoria = document.getElementById('filtroCategoriaNotificacoes');
    categoria?.addEventListener('change', carregarNotificacoes);
    document.getElementById('marcarTodasNotificacoes')?.addEventListener('click', async () => {
        try {
            await fazerRequisicao('/notificacoes/ler-todas', { method: 'PATCH' });
            await carregarNotificacoes();
            atualizarContadorNotificacoes();
        } catch (erro) { mostrarMensagem('listaNotificacoes', erro.message, 'error'); }
    });
});

window.carregarNotificacoes = carregarNotificacoes;
window.atualizarContadorNotificacoes = atualizarContadorNotificacoes;


const API_BASE_URL = window.location.origin;

function mostrarMensagem(elementoId, mensagem, tipo = 'info') {
    const elemento = document.getElementById(elementoId);
    if (!elemento) {
        console.warn(`Elemento com ID '${elementoId}' não encontrado para mostrar mensagem.`);
        return;
    }

    const aviso = document.createElement('div');
    aviso.className = tipo;
    aviso.textContent = mensagem;
    elemento.replaceChildren(aviso);

    setTimeout(() => {
        elemento.replaceChildren();
    }, 5000);
}

function mostrarTexto(container, mensagem, tipo = '') {
    if (!container) return;
    const paragrafo = document.createElement('p');
    if (tipo) paragrafo.className = tipo;
    paragrafo.textContent = mensagem;
    container.replaceChildren(paragrafo);
}

function criarCartaoResultado(campos, className = 'resultado-lista') {
    const cartao = document.createElement('div');
    cartao.className = className;
    campos.forEach(([rotulo, valor], index) => {
        const label = document.createElement('strong');
        label.textContent = `${rotulo}: `;
        cartao.append(label, document.createTextNode(valor == null ? '' : String(valor)));
        if (index < campos.length - 1) cartao.append(document.createElement('br'));
    });
    return cartao;
}

function criarBotaoResultado(texto, acao) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'resultado-lista';
    botao.style.width = '100%';
    botao.textContent = texto;
    botao.addEventListener('click', acao);
    return botao;
}
async function fazerRequisicao(url, options = {}) {
    try {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

        const token = sessionStorage.getItem('imuniza_token');
        const response = await fetch(fullUrl, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    },
    body: options.body,
});
        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = response.statusText || 'Erro na requisição';

            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorData.message || errorMessage;

                if (errorData.details) {
                    errorMessage += ` - Detalhes: ${errorData.details}`;
                }
            } catch (e) {
                if (responseText) {
                    errorMessage = responseText;
                }
            }

            const statusMessage = getStatusMessage(response.status);
            if (statusMessage) {
                errorMessage = `${statusMessage}: ${errorMessage}`;
            }

            throw new Error(errorMessage);
        }

        if (!responseText) {
            return null;
        }
        try {
            return JSON.parse(responseText);
        } catch (e) {
            console.warn('Resposta não é JSON válido:', responseText);
            return responseText;
        }

    } catch (error) {
        console.error('Erro em fazerRequisicao:', error);

        if (error.message === 'Failed to fetch') {
            throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
        }

        throw error;
    }
}

function getStatusMessage(status) {
    const statusMessages = {
        400: 'Requisição inválida',
        401: 'Não autorizado',
        403: 'Acesso proibido',
        404: 'Recurso não encontrado',
        409: 'Conflito de dados',
        422: 'Dados inválidos',
        500: 'Erro interno do servidor',
        503: 'Serviço indisponível'
    };

    return statusMessages[status] || null;
}

function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function verificarConexao() {
    try {
        await fazerRequisicao('/');
        return true;
    } catch (error) {
        console.error('Servidor não está respondendo:', error);
        return false;
    }
}

window.fazerRequisicao = fazerRequisicao;
window.mostrarMensagem = mostrarMensagem;
window.mostrarTexto = mostrarTexto;
window.criarCartaoResultado = criarCartaoResultado;
window.criarBotaoResultado = criarBotaoResultado;
window.debounce = debounce;
window.verificarConexao = verificarConexao;

// 1. Configuração da API (Variável base)
const API_BASE_URL = '';

// 2. Função para mostrar mensagens
function mostrarMensagem(elementoId, mensagem, tipo = 'info') {
    const elemento = document.getElementById(elementoId);
    elemento.innerHTML = `<div class="${tipo}">${mensagem}</div>`;
    setTimeout(() => {
        elemento.innerHTML = '';
    }, 5000);
}

// 3. Função para fazer requisições à API
 async function fazerRequisicao(url, options = {}) {
            try {
                const response = await fetch(url, {
                    method: options.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                    body: options.body,
                });

                const responseText = await response.text();

                // 2. Se a resposta NÃO for OK, tenta analisar o texto como JSON para pegar a mensagem de erro.
                if (!response.ok) {
                    let errorMessage = response.statusText || 'Erro na requisição';
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        // Se a resposta de erro não for JSON, usamos a mensagem padrão.
                    }
                    throw new Error(errorMessage);
                }

                if (responseText) {
                    return JSON.parse(responseText);
                }

                // 4. Se a resposta for OK, mas não tiver corpo, retorna null.
                return null;

            } catch (error) {
                console.error('Erro em fazerRequisicao:', error);
                throw error;
            }
        }
        let isSubmitting = false;

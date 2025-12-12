const API_BASE_URL = '';

// Função para mostrar mensagens
function mostrarMensagem(elementoId, mensagem, tipo = 'info') {
    const elemento = document.getElementById(elementoId);
    elemento.innerHTML = `<div class="${tipo}">${mensagem}</div>`;
    setTimeout(() => {
        elemento.innerHTML = '';
    }, 5000);
}

// Função para fazer requisições à API
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

                if (!response.ok) {
                    let errorMessage = response.statusText || 'Erro na requisição';
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        
                    }
                    throw new Error(errorMessage);
                }

                if (responseText) {
                    return JSON.parse(responseText);
                }

                return null;

            } catch (error) {
                console.error('Erro em fazerRequisicao:', error);
                throw error;
            }
        }
        let isSubmitting = false;

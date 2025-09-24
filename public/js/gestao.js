// public/js/gestao.js

// Variável global para armazenar a instância do gráfico. 
// Inicializada como null.
let dashboardChartInstance = null;

/**
 * Função principal para buscar os dados na API (/gestao/dados) e 
 * chamar a função de desenho do gráfico.
 */
function fetchDadosGestao() {
    const canvas = document.getElementById('dashboardChart');
    if (!canvas) {
        console.warn('Canvas do dashboard não encontrado. Certifique-se de que a seção está visível.');
        return; 
    }
    
    // Faz a requisição de dados à nova rota criada no index.js
    fetch('/gestao/dados')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Falha na API: ${response.statusText}`);
            }
            return response.json();
        })
        .then(dados => {
            // Se os dados vierem corretamente, desenha o gráfico
            desenharGrafico(dados);
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
            // Alert foi removido para evitar interrupção excessiva, mas pode ser reativado se preferir
            // alert('Não foi possível carregar os dados do dashboard: ' + error.message);
        });
}

/**
 * Desenha o gráfico usando a biblioteca Chart.js.
 * Garante que a instância antiga seja destruída antes de criar uma nova.
 */
function desenharGrafico(dados) {
    const ctx = document.getElementById('dashboardChart').getContext('2d');

    // **Lógica de DESTRUIÇÃO CORRIGIDA:** // Se uma instância anterior do Chart existir na nossa variável global, destruímos.
    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
        // Opcional: console.log('Instância anterior do gráfico destruída.');
    }
    
    const data = {
        labels: [
            'Cidadãos Cadastrados',
            'Tipos de Vacinas Disponíveis',
            'Total de Agendamentos Realizados'
        ],
        datasets: [{
            label: 'Totais do Sistema',
            data: [
                dados.totalCidadaos, 
                dados.totalVacinasDisponiveis, 
                dados.totalAgendamentos
            ],
            backgroundColor: [
                'rgba(54, 162, 235, 0.6)', // Azul (Cidadãos)
                'rgba(255, 99, 132, 0.6)', // Vermelho (Vacinas)
                'rgba(75, 192, 192, 0.6)'  // Ciano (Agendamentos)
            ],
            borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
        }]
    };

    const config = {
        type: 'bar', 
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Métricas Chave do Sistema de Vacinação'
                }
            },
            
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    },
                    
                    ticks: {
                        callback: function(value) { if (Number.isInteger(value)) { return value; } }
                    }
                }
            }
        },
    };

    // Cria e **ARMAZENA** a nova instância do gráfico na variável global.
    dashboardChartInstance = new Chart(ctx, config);
}
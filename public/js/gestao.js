// public/js/gestao.js

let dashboardChartInstance = null;

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
            
            desenharGrafico(dados);
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
    
        });
}

function desenharGrafico(dados) {
    const ctx = document.getElementById('dashboardChart').getContext('2d');

    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
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
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(75, 192, 192, 0.6)' 
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


    dashboardChartInstance = new Chart(ctx, config);
}
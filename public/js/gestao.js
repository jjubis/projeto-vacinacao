let dashboardChartInstance = null;

function fetchDadosGestao() {
    const canvas = document.getElementById('dashboardChart');
    if (!canvas) {
        console.warn('Canvas do dashboard não encontrado. Certifique-se de que a seção está visível.');
        return; 
    }
    
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

    const { totalCidadaos, totalVacinasEmEstoque, totalAgendamentos } = dados; 
    
    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
    }
    
    const data = {
        labels: [
            'Cidadãos Cadastrados',
            'Total de Doses em Estoque', 
            'Total de Agendamentos Realizados'
        ],
        datasets: [{
            label: 'Totais do Sistema',
            data: [
                totalCidadaos, 
                totalVacinasEmEstoque, 
                totalAgendamentos
            ],
            
            backgroundColor: [
                'rgba(60, 90, 129, 0.7)',  
                'rgba(67, 126, 198, 0.7)', 
                'rgba(179, 229, 252, 0.7)' 
            ],
            borderColor: [
                'rgba(60, 90, 129, 1)',
                'rgba(67, 126, 198, 1)',
                'rgba(179, 229, 252, 1)'
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

window.onload = fetchDadosGestao;
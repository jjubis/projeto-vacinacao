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

  const {
    totalCidadaos,
    totalVacinasEmEstoque,
    totalAgendados,
    totalRealizados,
    totalCancelados
} = dados;

const alertaEstoque = document.getElementById('alertaEstoque');

if (alertaEstoque) {
    if (dados.vacinasEstoqueBaixo && dados.vacinasEstoqueBaixo.length > 0) {

        const titulo = document.createElement('h3');
        titulo.textContent = '⚠️ Alerta de estoque baixo';
        const itens = dados.vacinasEstoqueBaixo.map(item => {
            const paragrafo = document.createElement('p');
            const vacina = document.createElement('strong');
            vacina.textContent = item.vacina;
            paragrafo.append(vacina, document.createTextNode(
                ` — ${item.quantidade} dose(s) disponíveis (${item.posto})`
            ));
            return paragrafo;
        });
        alertaEstoque.replaceChildren(titulo, ...itens);

        alertaEstoque.style.display = 'block';

    } else {
        alertaEstoque.replaceChildren();
        alertaEstoque.style.display = 'none';
    }
}
    
    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
    }
    
    const data = {
       labels: [
    'Cidadãos Cadastrados',
    'Total de Doses em Estoque',
    'Agendados',
    'Realizados',
    'Cancelados'
],
        datasets: [{
            label: 'Totais do Sistema',
           data: [
    totalCidadaos,
    totalVacinasEmEstoque,
    totalAgendados,
    totalRealizados,
    totalCancelados
],
            
           backgroundColor: [
    'rgba(60, 90, 129, 0.7)',
    'rgba(67, 126, 198, 0.7)',
    'rgba(179, 229, 252, 0.7)',
    'rgba(129, 199, 132, 0.7)',
    'rgba(239, 154, 154, 0.7)'
],
borderColor: [
    'rgba(60, 90, 129, 1)',
    'rgba(67, 126, 198, 1)',
    'rgba(179, 229, 252, 1)',
    'rgba(129, 199, 132, 1)',
    'rgba(239, 154, 154, 1)'
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

// Event listeners para formulários
function configurarEventListeners() {
    try {
        // Cidadão (usa funções do cidadao.js)
        document.getElementById('cadastroForm').addEventListener('submit', cadastrarCidadao);
        document.getElementById('atualizarForm').addEventListener('submit', atualizarCidadao);
        document.getElementById('excluirForm').addEventListener('submit', excluirCidadao);

        // Vacina (usa funções do vacina.js)
        document.getElementById('cadastroVacinaForm').addEventListener('submit', cadastrarVacina);
        document.getElementById('atualizarVacinaForm').addEventListener('submit', atualizarVacina);
        document.getElementById('excluirVacinaForm').addEventListener('submit', excluirVacina);

        // Posto (usa funções do posto.js)
        document.getElementById('cadastroPostoForm').addEventListener('submit', cadastrarPosto);
        document.getElementById('atualizarPostoForm').addEventListener('submit', atualizarPosto);
        document.getElementById('excluirPostoForm').addEventListener('submit', excluirPosto);

        // Agendamento (usa funções do agendamento.js)
        document.getElementById('cadastroAgendamentoForm').addEventListener('submit', cadastrarAgendamento);
        document.getElementById('atualizarAgendamentoForm').addEventListener('submit', atualizarAgendamento);
        document.getElementById('excluirAgendamentoForm').addEventListener('submit', excluirAgendamento);
    } catch (error) {
        console.log("Aviso: Elemento não encontrado ao configurar event listeners. Isso pode ser normal se o HTML for modular.", error);
    }
}


// Sistema de navegação principal
document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('#menu li');
    const sections = document.querySelectorAll('main section');

    function aplicarMascaras() {
        
        const cpfCadastro = document.getElementById('cpf');
        if (cpfCadastro) {
            VMasker(cpfCadastro).maskPattern('999.999.999-99');
        }
        const cpfAtualizar = document.getElementById('novoCpf');
        if (cpfAtualizar) {
            VMasker(cpfAtualizar).maskPattern('999.999.999-99');
        }

        const telefoneCadastro = document.getElementById('telefone');
        if (telefoneCadastro) {
            VMasker(telefoneCadastro).maskPattern('(99) 99999-9999');
        }
        const telefoneAtualizar = document.getElementById('novoTelefone');
        if (telefoneAtualizar) {
            VMasker(telefoneAtualizar).maskPattern('(99) 99999-9999');
        }
    }
    
    aplicarMascaras();

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            const opcao = this.getAttribute('data-opcao');

            menuItems.forEach(i => i.classList.remove('ativo'));

            this.classList.add('ativo');

            sections.forEach(section => section.classList.remove('active'));

            
            if (opcao === 'S') {
                const secaoSair = document.getElementById('secaoS'); 
                if (secaoSair) {
                    secaoSair.classList.add('active');
                }
                return; 
            }

            const secaoAtiva = document.getElementById(`secao${opcao}`);
            
            if (secaoAtiva) {
                secaoAtiva.classList.add('active');

                switch (opcao) {
                    case '0': 
                        fetchDadosGestao();
                        break;
                    case '2': 
                        listarCidadaos(); 
                        break;
                    case '6': 
                        listarVacinas(); 
                        break;
                    case '10':
                        listarPostos(); 
                        break;
                    case '13': 
                        carregarDadosParaAgendamento(); 
                        break;
                    case '14':
                        listarAgendamentosDetalhados(); 
                        break;
                    case '15':
                        carregarStatusParaAtualizacao(); 
                        break;
                    case '16': 
                        break;
                }
            }
        });
    });

    const primeiroItem = document.querySelector('#menu li[data-opcao="1"]');
    if (primeiroItem) {
        primeiroItem.click();
    }

    // Event listeners para formulários
    configurarEventListeners();
});
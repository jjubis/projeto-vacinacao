// public/js/vacinacao.js

// As funções utilitárias (mostrarMensagem, fazerRequisicao)
// e as funções CRUD (listarCidadaos, listarVacinas, etc.)
// são carregadas nos scripts antes deste arquivo.

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

        // Posto (usa funções do posto.js - a serem criadas)
        document.getElementById('cadastroPostoForm').addEventListener('submit', cadastrarPosto);
        document.getElementById('atualizarPostoForm').addEventListener('submit', atualizarPosto);
        document.getElementById('excluirPostoForm').addEventListener('submit', excluirPosto);

        // Agendamento (usa funções do agendamento.js - a serem criadas)
        document.getElementById('cadastroAgendamentoForm').addEventListener('submit', cadastrarAgendamento);
        document.getElementById('atualizarAgendamentoForm').addEventListener('submit', atualizarAgendamento);
        document.getElementById('excluirAgendamentoForm').addEventListener('submit', excluirAgendamento);
    } catch (error) {
        // É normal ter erros se algum formulário ainda não existe no HTML.
        console.log("Aviso: Elemento não encontrado ao configurar event listeners. Isso pode ser normal se o HTML for modular.", error);
    }
}


// Sistema de navegação principal
document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('#menu li');
    const sections = document.querySelectorAll('main section');

    // Função para aplicar as máscaras nos campos de entrada
    function aplicarMascaras() {
        // Assume que você tem a biblioteca VMasker carregada no seu HTML.
        
        // Máscaras para CPF
        const cpfCadastro = document.getElementById('cpf');
        if (cpfCadastro) {
            VMasker(cpfCadastro).maskPattern('999.999.999-99');
        }
        const cpfAtualizar = document.getElementById('novoCpf');
        if (cpfAtualizar) {
            VMasker(cpfAtualizar).maskPattern('999.999.999-99');
        }

        // Máscaras para Telefone
        const telefoneCadastro = document.getElementById('telefone');
        if (telefoneCadastro) {
            VMasker(telefoneCadastro).maskPattern('(99) 99999-9999');
        }
        const telefoneAtualizar = document.getElementById('novoTelefone');
        if (telefoneAtualizar) {
            VMasker(telefoneAtualizar).maskPattern('(99) 99999-9999');
        }
    }
    
    // Chamada para aplicar as máscaras assim que a página carregar
    aplicarMascaras();

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            const opcao = this.getAttribute('data-opcao');

            // Remove classe ativo de todos os itens
            menuItems.forEach(i => i.classList.remove('ativo'));

            // Adiciona classe ativo ao item clicado
            this.classList.add('ativo');

            // Esconde todas as seções
            sections.forEach(section => section.classList.remove('active'));

            // Mostra a seção correspondente
            const secaoAtiva = document.getElementById(`secao${opcao}`);
            if (secaoAtiva) {
                secaoAtiva.classList.add('active');

                // Carrega dados automaticamente para seções de listagem
                switch (opcao) {
                    case '2': // Listar Cidadãos
                        // Esta função está no cidadao.js
                        listarCidadaos(); 
                        break;
                    case '6': // Listar Vacinas
                        // Esta função estará no vacina.js
                        listarVacinas(); 
                        break;
                    case '10': // Listar Postos
                        // Esta função estará no posto.js
                        listarPostos(); 
                        break;
                    case '13': // Listar Status
                        // Esta função estará no agendamento.js
                        listarStatus(); 
                        break;
                    case '14': // Agendamento - Carregar dados
                        // Esta função estará no agendamento.js
                        carregarDadosParaAgendamento(); 
                        break;
                    case '15': // Listar Agendamentos
                        // Esta função estará no agendamento.js
                        listarAgendamentosDetalhados(); 
                        break;
                    case '16': // Atualizar Status - Carregar dados
                        // Esta função estará no agendamento.js
                        carregarStatusParaAtualizacao(); 
                        break;
                    // ...
                }
            }
        });
    });

    // Ativa a primeira seção por padrão
    // Certifique-se de que o primeiro item do menu tenha data-opcao="1"
    const primeiroItem = document.querySelector('#menu li[data-opcao="1"]');
    if (primeiroItem) {
        primeiroItem.click();
    }


    // Event listeners para formulários
    configurarEventListeners();
});
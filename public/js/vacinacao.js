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

function aplicarMascarasAuth() {
    const cpfRegistro = document.getElementById('registroCpf');
    if (cpfRegistro) {
        VMasker(cpfRegistro).maskPattern('999.999.999-99');
    }
}

function configurarNavegacaoMenu() {
    const menuItems = document.querySelectorAll('#menu li');
    const sections = document.querySelectorAll('main section');

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            const opcao = this.getAttribute('data-opcao');

            // Opção "Sair do Sistema" agora faz logout de verdade
            if (opcao === 'S') {
                fazerLogout();
                return;
            }

            menuItems.forEach(i => i.classList.remove('ativo'));
            this.classList.add('ativo');

            sections.forEach(section => section.classList.remove('active'));

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
}

async function iniciarApp() {
    mostrarApp();

    aplicarMascaras();
    configurarNavegacaoMenu();
    configurarEventListeners();

    const primeiroItem = document.querySelector('#menu li[data-opcao="1"]');
    if (primeiroItem) {
        primeiroItem.click();
    }
}

// Ponto de entrada da aplicação
document.addEventListener('DOMContentLoaded', async function () {
    // Conecta o formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', fazerLogin);
    }

    // Conecta o formulário de registro (autorregistro de cidadão)
    const registroForm = document.getElementById('registroForm');
    if (registroForm) {
        registroForm.addEventListener('submit', fazerRegistroCidadao);
    }

    // Máscara de CPF no formulário de registro
    aplicarMascarasAuth();

    // Checa se já existe uma sessão ativa antes de decidir o que mostrar
    const estaLogado = await verificarSessao();

    if (estaLogado) {
        iniciarApp();
    } else {
        mostrarTelaLogin();
    }
});

window.iniciarApp = iniciarApp;
 // ===== FUNÇÕES PARA STATUS FIXOS =====

// Lista fixa de status de agendamento
const STATUSES_FIXOS = [
    { id: 1, descricao: 'Agendado' },
    { id: 2, descricao: 'Realizado' },
    { id: 3, descricao: 'Cancelado' }
];

/**
 * Preenche o elemento select com os status fixos.
 * @param {string} selectId - O ID do elemento <select> a ser preenchido.
 */
function preencherSelectStatus(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return; 

    while (select.options.length > 1) {
        select.remove(1);
    }

    STATUSES_FIXOS.forEach(status => {
        const option = document.createElement('option');
        option.value = status.id;
        option.textContent = status.descricao;
        select.appendChild(option);
    });
}

function listarStatus() {
    const lista = document.getElementById('listaStatus');
    if (!lista) return;

    lista.innerHTML = STATUSES_FIXOS.map(status => `
        <div class="resultado-lista">
            <strong>ID:</strong> ${status.id}<br>
            <strong>Descrição:</strong> ${status.descricao}
        </div>
    `).join('');
}

// ===== FUNÇÕES PARA AGENDAMENTO (que usam os status fixos) =====

function carregarStatusParaAtualizacao() {
    
    preencherSelectStatus('novoStatusAgendamento');
}
        // ===== FUNÇÕES PARA AGENDAMENTOS =====

       async function carregarDadosParaAgendamento() {
    try {
        const [cidadaos, vacinas, postos] = await Promise.all([
            fazerRequisicao('/cidadaos'),
            fazerRequisicao('/vacinas'),
            fazerRequisicao('/postos')
        ]);

        const cidadaoSelect = document.getElementById('cidadaoSelect');
        cidadaoSelect.innerHTML = '<option value="">Selecione um cidadão</option>';
        cidadaos.forEach(cidadao => {
            cidadaoSelect.innerHTML += `<option value="${cidadao.id}">${cidadao.nome} - ${cidadao.cpf}</option>`;
        });

        const vacinaSelect = document.getElementById('vacinaSelect');
        vacinaSelect.innerHTML = '<option value="">Selecione uma vacina</option>';
        vacinas.forEach(vacina => {
            vacinaSelect.innerHTML += `<option value="${vacina.id}">${vacina.nome} - ${vacina.fabricante}</option>`;
        });

        const postoSelect = document.getElementById('postoSelect');
        postoSelect.innerHTML = '<option value="">Selecione um posto</option>';
        postos.forEach(posto => {
            postoSelect.innerHTML += `<option value="${posto.id}">${posto.nome}</option>`;
        });

        preencherSelectStatus('statusSelect');

    } catch (erro) {
        mostrarMensagem('mensagemAgendamento', `Erro ao carregar dados: ${erro.message}`, 'error');
    }
}

        async function cadastrarAgendamento(e) {
            e.preventDefault();

            const dados = {
                cidadaoId: parseInt(document.getElementById('cidadaoSelect').value),
                vacinaId: parseInt(document.getElementById('vacinaSelect').value),
                postoId: parseInt(document.getElementById('postoSelect').value),
                statusId: parseInt(document.getElementById('statusSelect').value),
                dataHora: document.getElementById('dataHoraAgendamento').value
            };

            try {
                await fazerRequisicao('/agendamentos', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });

                mostrarMensagem('mensagemAgendamento', 'Agendamento cadastrado com sucesso!', 'success');
                document.getElementById('cadastroAgendamentoForm').reset();
            } catch (erro) {
                mostrarMensagem('mensagemAgendamento', `Erro ao cadastrar agendamento: ${erro.message}`, 'error');
            }
        }

        async function listarAgendamentosDetalhados() {
            const lista = document.getElementById('listaAgendamentos');
            lista.innerHTML = '<p>Carregando...</p>'; 
            try {
                const agendamentos = await fazerRequisicao('/agendamentos');

                if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
                    lista.innerHTML = '<p>Nenhum agendamento cadastrado.</p>';
                    return;
                }

                lista.innerHTML = agendamentos.map(agendamento => `
            <div class="resultado-lista">
                <strong>ID:</strong> ${agendamento.id}<br>
                <strong>Cidadão:</strong> ${agendamento.cidadaoNome || 'N/A'}<br>
                <strong>CPF:</strong> ${agendamento.cidadaoCPF || 'N/A'}<br>
                <strong>Endereço:</strong> ${agendamento.cidadaoEndereco || 'N/A'}<br>
                <strong>Vacina:</strong> ${agendamento.vacinaNome || 'N/A'} (${agendamento.vacinaFabricante || 'N/A'})<br>
                <strong>Posto:</strong> ${agendamento.postoNome || 'N/A'} - ${agendamento.postoEndereco || 'N/A'}<br>
                <strong>Status:</strong> ${agendamento.statusDescricao || 'N/A'}<br>
                <strong>Data/Hora:</strong> ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}
            </div>
        `).join('');
            } catch (erro) {
                lista.innerHTML = `<p class="error">Erro ao carregar agendamentos: ${erro.message}</p>`;
            }
        }

       function carregarStatusParaAtualizacao() {
    
    preencherSelectStatus('novoStatusAgendamento');
}

        async function buscarAgendamentoParaAtualizar() {
    const termo = document.getElementById('buscarAgendamentoAtualizar').value.trim();
    if (!termo) {
        mostrarMensagem('mensagemAgendamentoAtualizar', 'Digite um ID para buscar', 'error');
        return;
    }

    try {
        const agendamentos = await fazerRequisicao('/agendamentos');
        
        if (!Array.isArray(agendamentos)) {
            throw new Error('Formato de dados inesperado recebido do servidor.');
        }

        const agendamento = agendamentos.find(a => a.id == termo);
        const container = document.getElementById('resultadoBuscaAgendamentoAtualizar');

        if (!agendamento) {
            container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            document.getElementById('atualizarAgendamentoForm').style.display = 'none';
            return;
        }

        // Preenche os campos do formulário e exibe o formulário
        document.getElementById('idAgendamentoAtualizar').value = agendamento.id;
        document.getElementById('atualizarAgendamentoForm').style.display = 'block';
        document.getElementById('agendamentoSelecionadoAtualizar').innerText =
            `${agendamento.cidadaoNome || 'N/A'} - ${agendamento.vacinaNome || 'N/A'}`;

        container.innerHTML = `
            <div class="resultado-lista">
              <strong>Cidadão:</strong> ${agendamento.cidadaoNome || 'N/A'}<br>
              <strong>Vacina:</strong> ${agendamento.vacinaNome || 'N/A'}<br>
              <strong>Posto:</strong> ${agendamento.postoNome || 'N/A'}<br>
              <strong>Status Atual:</strong> ${agendamento.statusDescricao || 'N/A'}<br>
              <strong>Data/Hora:</strong> ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}
            </div>
        `;

        // Popula o select com os status fixos e já seleciona o atual
        const select = document.getElementById('novoStatusAgendamento');
        select.innerHTML = '<option value="">Selecione um status</option>';

        const fixedStatuses = [
            { id: 1, descricao: 'Agendado' },
            { id: 2, descricao: 'Realizado' },
            { id: 3, descricao: 'Cancelado' }
        ];

        fixedStatuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.descricao;
            if (s.id === agendamento.statusId) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

    } catch (erro) {
        mostrarMensagem('mensagemAgendamentoAtualizar', `Erro ao buscar agendamento: ${erro.message}`, 'error');
        document.getElementById('atualizarAgendamentoForm').style.display = 'none';
    }
}
        async function atualizarAgendamento(e) {
            e.preventDefault();

            const id = document.getElementById('idAgendamentoAtualizar').value;
            const statusId = parseInt(document.getElementById('novoStatusAgendamento').value);

            try {
                await fazerRequisicao(`/agendamentos/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ statusId })
                });

                mostrarMensagem('mensagemAgendamentoAtualizar', 'Agendamento atualizado com sucesso!', 'success');
                document.getElementById('atualizarAgendamentoForm').style.display = 'none';
                document.getElementById('resultadoBuscaAgendamentoAtualizar').innerHTML = '';
            } catch (erro) {
                mostrarMensagem('mensagemAgendamentoAtualizar', `Erro ao atualizar agendamento: ${erro.message}`, 'error');
            }
        }

        async function buscarAgendamentoParaExcluir() {
            const termo = document.getElementById('buscarAgendamentoExcluir').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemAgendamentoExcluir', 'Digite um ID para buscar', 'error');
                return;
            }

            try {
                const agendamentos = await fazerRequisicao('/agendamentos');
                const agendamento = agendamentos.find(a => a.id == termo);
                const container = document.getElementById('resultadoBuscaAgendamentoExcluir');

                if (!agendamento) {
                    container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
                    return;
                }

                // Preenche também o campo hidden com o ID para futura exclusão
                document.getElementById('idAgendamentoExcluir').value = agendamento.id;
                document.getElementById('excluirAgendamentoForm').style.display = 'block';
                document.getElementById('agendamentoSelecionadoExcluir').innerText =
                    `${agendamento.cidadaoNome || 'N/A'} - ${agendamento.vacinaNome || 'N/A'}`;

                // Exibe os detalhes do agendamento
                container.innerHTML = `
                <div class="resultado-lista" data-id="${agendamento.id}">
                    <strong>Cidadão:</strong> ${agendamento.cidadaoNome || 'N/A'}<br>
                    <strong>Vacina:</strong> ${agendamento.vacinaNome || 'N/A'}<br>
                    <strong>Posto:</strong> ${agendamento.postoNome || 'N/A'}<br>
                    <strong>Status Atual:</strong> ${agendamento.statusDescricao || 'N/A'}<br>
                    <strong>Data/Hora:</strong> ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}<br>
                </div>
            `;
            } catch (erro) {
                mostrarMensagem('mensagemAgendamentoExcluir', `Erro ao buscar agendamento: ${erro.message}`, 'error');
            }
        }

       async function excluirAgendamento(e) {
    
    e.preventDefault();

    const confirmacao = confirm('Tem certeza que deseja excluir este agendamento?');

    if (!confirmacao) {
        return;
    }

    const id = document.getElementById('idAgendamentoExcluir').value;

    if (!id) {
        mostrarMensagem('mensagemAgendamentoExcluir', 'ID do agendamento não encontrado.', 'error');
        return;
    }

    try {
        const resposta = await fetch(`/agendamentos/${id}`, {
            method: 'DELETE'
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.error || 'Erro ao excluir.');
        }

        mostrarMensagem('mensagemAgendamentoExcluir', 'Agendamento excluído com sucesso!', 'success');
        document.getElementById('excluirAgendamentoForm').style.display = 'none';
        document.getElementById('resultadoBuscaAgendamentoExcluir').innerHTML = '';
    } catch (erro) {
        mostrarMensagem('mensagemAgendamentoExcluir', `Erro ao excluir agendamento: ${erro.message}`, 'error');
    }
}

window.cadastrarAgendamento = cadastrarAgendamento;
window.atualizarAgendamento = atualizarAgendamento;
window.excluirAgendamento = excluirAgendamento;

window.listarStatus = listarStatus;
window.carregarDadosParaAgendamento = carregarDadosParaAgendamento; 
window.listarAgendamentosDetalhados = listarAgendamentosDetalhados; 
window.carregarStatusParaAtualizacao = carregarStatusParaAtualizacao;

window.buscarAgendamentoParaAtualizar = buscarAgendamentoParaAtualizar;
window.buscarAgendamentoParaExcluir = buscarAgendamentoParaExcluir;
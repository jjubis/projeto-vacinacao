
const STATUSES_FIXOS = [
    { id: 1, descricao: 'Agendado' },
    { id: 2, descricao: 'Realizado' },
    { id: 3, descricao: 'Cancelado' }
];

function preencherSelectStatus(selectId) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`Select com ID '${selectId}' não encontrado.`);
        return;
    }

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

async function carregarDadosParaAgendamento() {
    try {
        const [cidadaos, vacinas, postos] = await Promise.all([
            fazerRequisicao('/cidadaos'),
            fazerRequisicao('/vacinas'),
            fazerRequisicao('/postos')
        ]);

        const cidadaoSelect = document.getElementById('cidadaoSelect');
        cidadaoSelect.innerHTML = '<option value="">Selecione um cidadão</option>';
        cidadaos.forEach(c => {
            cidadaoSelect.innerHTML += `<option value="${c.id}">${c.nome} - CPF: ${formatarCPF(c.cpf)}</option>`;
        });

        const vacinaSelect = document.getElementById('vacinaSelect');
        vacinaSelect.innerHTML = '<option value="">Selecione uma vacina</option>';
        vacinas.forEach(v => {
            vacinaSelect.innerHTML += `<option value="${v.id}">${v.nome} (${v.fabricante})</option>`;
        });

        const postoSelect = document.getElementById('postoSelect');
        postoSelect.innerHTML = '<option value="">Selecione um posto</option>';
        postos.forEach(p => {
            postoSelect.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
        });

        preencherSelectStatus('statusSelect');

        const dataHoraInput = document.getElementById('dataHoraAgendamento');
        if (dataHoraInput) {
            const agora = new Date();
            agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset()); // Ajusta timezone
            dataHoraInput.min = agora.toISOString().slice(0, 16);
        }

    } catch (erro) {
        mostrarMensagem('mensagemAgendamento', `Erro ao carregar dados: ${erro.message}`, 'error');
    }
}

async function cadastrarAgendamento(e) {
    e.preventDefault();

    const cidadaoId = parseInt(document.getElementById('cidadaoSelect').value);
    const vacinaId = parseInt(document.getElementById('vacinaSelect').value);
    const postoId = parseInt(document.getElementById('postoSelect').value);
    const statusId = parseInt(document.getElementById('statusSelect').value);
    const dataHora = document.getElementById('dataHoraAgendamento').value;

    if (!cidadaoId || !vacinaId || !postoId || !statusId || !dataHora) {
        mostrarMensagem('mensagemAgendamento', 'Por favor, preencha todos os campos.', 'error');
        return;
    }

    const dataAgendamento = new Date(dataHora);
    const agora = new Date();

    if (dataAgendamento < agora) {
        mostrarMensagem('mensagemAgendamento', 'A data do agendamento não pode ser no passado.', 'error');
        return;
    }

    const dados = {
        cidadaoId,
        vacinaId,
        postoId,
        statusId,
        dataHora
    };

    try {
        await fazerRequisicao('/agendamentos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagemAgendamento', 'Agendamento cadastrado com sucesso!', 'success');
        document.getElementById('cadastroAgendamentoForm').reset();

        if (document.getElementById('secao14').classList.contains('active')) {
            listarAgendamentosDetalhados();
        }

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

        lista.innerHTML = agendamentos.map(a => {
            const statusClass = a.statusId === 1 ? 'status-agendado' :
                                a.statusId === 2 ? 'status-realizado' :
                                'status-cancelado';

            return `
                <div class="resultado-lista ${statusClass}">
                    <strong>ID:</strong> ${a.id}<br>
                    <strong>Cidadão:</strong> ${a.cidadaoNome}<br>
                    <strong>CPF:</strong> ${formatarCPF(a.cidadaoCPF)}<br>
                    <strong>Endereço:</strong> ${a.cidadaoEndereco}<br>
                    <strong>Vacina:</strong> ${a.vacinaNome} (${a.vacinaFabricante})<br>
                    <strong>Posto:</strong> ${a.postoNome} - ${a.postoEndereco}<br>
                    <strong>Status:</strong> <span class="status-badge">${a.statusDescricao}</span><br>
                    <strong>Data/Hora:</strong> ${formatarDataHora(a.dataHora)}
                </div>
            `;
        }).join('');

    } catch (erro) {
        lista.innerHTML = `<p class="error">Erro ao carregar agendamentos: ${erro.message}</p>`;
    }
}

function carregarStatusParaAtualizacao() {
    preencherSelectStatus('novoStatusAgendamento');
}

async function buscarAgendamentoParaAtualizar() {
    const termo = document.getElementById('buscarAgendamentoAtualizar').value.trim();
    const container = document.getElementById('resultadoBuscaAgendamentoAtualizar');

    if (!termo) {
        mostrarMensagem('mensagemAgendamentoAtualizar', 'Digite um ID.', 'error');
        return;
    }

    container.innerHTML = '<p>Buscando...</p>';

    try {
        const lista = await fazerRequisicao('/agendamentos');
        const agendamento = lista.find(a => a.id == termo);

        if (!agendamento) {
            container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            document.getElementById('atualizarAgendamentoForm').style.display = 'none';
            return;
        }

        document.getElementById('idAgendamentoAtualizar').value = agendamento.id;
        document.getElementById('agendamentoSelecionadoAtualizar').innerText =
            `${agendamento.cidadaoNome} - ${agendamento.vacinaNome}`;

        document.getElementById('atualizarAgendamentoForm').style.display = 'block';

        container.innerHTML = `
            <div class="resultado-lista">
                <strong>Cidadão:</strong> ${agendamento.cidadaoNome}<br>
                <strong>Vacina:</strong> ${agendamento.vacinaNome}<br>
                <strong>Status Atual:</strong> ${agendamento.statusDescricao}<br>
                <strong>Data/Hora:</strong> ${formatarDataHora(agendamento.dataHora)}
            </div>
        `;

        const select = document.getElementById('novoStatusAgendamento');
        select.innerHTML = '<option value="">Selecione um status</option>';

        STATUSES_FIXOS.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.descricao;
            if (s.id === agendamento.statusId) opt.selected = true;
            select.appendChild(opt);
        });

        document.getElementById('atualizarAgendamentoForm').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });

    } catch (erro) {
        container.innerHTML = `<p class="error">Erro: ${erro.message}</p>`;
        mostrarMensagem('mensagemAgendamentoAtualizar', `Erro: ${erro.message}`, 'error');
    }
}

async function atualizarAgendamento(e) {
    e.preventDefault();

    const id = document.getElementById('idAgendamentoAtualizar').value;
    const statusId = parseInt(document.getElementById('novoStatusAgendamento').value);

    if (!statusId) {
        mostrarMensagem('mensagemAgendamentoAtualizar', 'Selecione um status.', 'error');
        return;
    }

    try {
        await fazerRequisicao(`/agendamentos/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ statusId })
        });

        mostrarMensagem('mensagemAgendamentoAtualizar', 'Agendamento atualizado com sucesso!', 'success');

        if (window.desenharGrafico && window.fetchDadosGestao) {
            fetchDadosGestao();
        }

        document.getElementById('atualizarAgendamentoForm').style.display = 'none';
        document.getElementById('resultadoBuscaAgendamentoAtualizar').innerHTML = '';
        document.getElementById('buscarAgendamentoAtualizar').value = '';

        if (document.getElementById('secao14').classList.contains('active')) {
            listarAgendamentosDetalhados();
        }

    } catch (erro) {
        mostrarMensagem('mensagemAgendamentoAtualizar', `Erro: ${erro.message}`, 'error');
    }
}

async function buscarAgendamentoParaExcluir() {
    const termo = document.getElementById('buscarAgendamentoExcluir').value.trim();
    const container = document.getElementById('resultadoBuscaAgendamentoExcluir');

    if (!termo) {
        mostrarMensagem('mensagemAgendamentoExcluir', 'Digite um ID.', 'error');
        return;
    }

    container.innerHTML = '<p>Buscando...</p>';

    try {
        const lista = await fazerRequisicao('/agendamentos');
        const agendamento = lista.find(a => a.id == termo);

        if (!agendamento) {
            container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            document.getElementById('excluirAgendamentoForm').style.display = 'none';
            return;
        }

        if (agendamento.statusId === 2) {
            container.innerHTML = `
                <div class="resultado-lista">
                    <p class="error">⚠️ Este agendamento está com status "Realizado" e não pode ser excluído.</p>
                    <strong>Cidadão:</strong> ${agendamento.cidadaoNome}<br>
                    <strong>Vacina:</strong> ${agendamento.vacinaNome}<br>
                    <strong>Status:</strong> ${agendamento.statusDescricao}
                </div>
            `;
            document.getElementById('excluirAgendamentoForm').style.display = 'none';
            return;
        }

        document.getElementById('idAgendamentoExcluir').value = agendamento.id;
        document.getElementById('agendamentoSelecionadoExcluir').innerText =
            `${agendamento.cidadaoNome} - ${agendamento.vacinaNome}`;

        document.getElementById('excluirAgendamentoForm').style.display = 'block';

        container.innerHTML = `
            <div class="resultado-lista">
                <strong>Cidadão:</strong> ${agendamento.cidadaoNome}<br>
                <strong>Vacina:</strong> ${agendamento.vacinaNome}<br>
                <strong>Posto:</strong> ${agendamento.postoNome}<br>
                <strong>Status:</strong> ${agendamento.statusDescricao}<br>
                <strong>Data/Hora:</strong> ${formatarDataHora(agendamento.dataHora)}
            </div>
        `;

        document.getElementById('excluirAgendamentoForm').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });

    } catch (erro) {
        container.innerHTML = `<p class="error">Erro: ${erro.message}</p>`;
        mostrarMensagem('mensagemAgendamentoExcluir', `Erro: ${erro.message}`, 'error');
    }
}

async function excluirAgendamento(e) {
    e.preventDefault();

    const confirmacao = confirm('⚠️ Tem certeza que deseja excluir este agendamento?\n\nEsta ação não pode ser desfeita!');
    if (!confirmacao) return;

    const id = document.getElementById('idAgendamentoExcluir').value;

    try {
        await fazerRequisicao(`/agendamentos/${id}`, { method: 'DELETE' });

        mostrarMensagem('mensagemAgendamentoExcluir', 'Agendamento excluído com sucesso!', 'success');

        document.getElementById('excluirAgendamentoForm').style.display = 'none';
        document.getElementById('resultadoBuscaAgendamentoExcluir').innerHTML = '';
        document.getElementById('buscarAgendamentoExcluir').value = '';

        if (document.getElementById('secao14').classList.contains('active')) {
            listarAgendamentosDetalhados();
        }

    } catch (erro) {
        mostrarMensagem('mensagemAgendamentoExcluir', `Erro: ${erro.message}`, 'error');
    }
}

function formatarCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarDataHora(dataHora) {
    if (!dataHora) return '';
    try {
        const data = new Date(dataHora);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dataHora;
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
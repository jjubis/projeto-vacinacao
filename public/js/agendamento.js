const STATUSES_FIXOS = [
    { id: 'agendado', descricao: 'Agendado' },
    { id: 'realizado', descricao: 'Realizado' },
    { id: 'cancelado', descricao: 'Cancelado' }
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
        const ehFuncionario = usuarioLogado && usuarioLogado.papel === 'funcionario';

        const cidadaoSelect = document.getElementById('cidadaoSelect');
        const labelCidadaoSelect = document.getElementById('labelCidadaoSelect');
        const agendandoParaMim = document.getElementById('agendandoParaMim');

        if (ehFuncionario) {
            // Funcionário escolhe qual cidadão está sendo agendado
            cidadaoSelect.style.display = '';
            labelCidadaoSelect.style.display = '';
            agendandoParaMim.style.display = 'none';
            cidadaoSelect.required = true;

            const respostaCidadaos = await fazerRequisicao('/cidadaos');
            const cidadaos = respostaCidadaos.data?.pacientes || [];
            cidadaoSelect.innerHTML = '<option value="">Selecione um cidadão</option>';
            cidadaos.forEach(c => {
                cidadaoSelect.innerHTML += `<option value="${c.id}">${c.nome} - CPF: ${formatarCPF(c.cpf)}</option>`;
            });
        } else {
            // Cidadão agenda para si mesmo — não precisa (nem pode) escolher
            cidadaoSelect.style.display = 'none';
            labelCidadaoSelect.style.display = 'none';
            cidadaoSelect.required = false;
            cidadaoSelect.innerHTML = `<option value="${usuarioLogado.paciente_id}" selected>${usuarioLogado.nome}</option>`;

            agendandoParaMim.style.display = 'block';
            agendandoParaMim.textContent = `Agendando para: ${usuarioLogado.nome}`;
        }

        const respostaVacinas = await fazerRequisicao('/vacinas');
        const vacinas = respostaVacinas.data?.vacinas || [];
        const vacinaSelect = document.getElementById('vacinaSelect');
        vacinaSelect.innerHTML = '<option value="">Selecione uma vacina</option>';
        vacinas.forEach(v => {
            vacinaSelect.innerHTML += `<option value="${v.id}">${v.nome} (${v.fabricante})</option>`;
        });

        // Unidade única (UBS Aterrado) — detectada automaticamente, sem seleção manual
        const respostaPostos = await fazerRequisicao('/postos');
        const postos = respostaPostos.data || [];
        const infoUnidade = document.getElementById('infoUnidade');
        const postoIdInput = document.getElementById('postoIdAgendamento');

        if (postos && postos.length > 0) {
            const unidade = postos[0];
            postoIdInput.value = unidade.id;
            infoUnidade.textContent = `Unidade: ${unidade.nome} - ${unidade.endereco}`;
        } else {
            infoUnidade.textContent = 'Nenhuma unidade de saúde cadastrada no sistema.';
        }

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

    const ehFuncionario = usuarioLogado && usuarioLogado.papel === 'funcionario';

    const pacienteId = ehFuncionario
        ? Number(document.getElementById('cidadaoSelect').value)
        : Number(usuarioLogado.paciente_id);

    const vacinaId = Number(document.getElementById('vacinaSelect').value);
    const postoId = Number(document.getElementById('postoIdAgendamento').value);
    const dataHora = document.getElementById('dataHoraAgendamento').value;

    if (!pacienteId || !vacinaId || !postoId || !dataHora) {
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
        paciente_id: pacienteId,
        vacina_id: vacinaId,
        posto_id: postoId,
        data_agendamento: dataHora
    };

    try {
        await fazerRequisicao('/agendamentos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagemAgendamento', 'Agendamento cadastrado com sucesso!', 'success');
        document.getElementById('cadastroAgendamentoForm').reset();

        const secao14 = document.getElementById('secao14');
        if (secao14 && secao14.classList.contains('active')) {
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
        const resposta = await fazerRequisicao('/agendamentos');
        const agendamentos = resposta.data || [];

        if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
            lista.innerHTML = '<p>Nenhum agendamento cadastrado.</p>';
            return;
        }

        lista.innerHTML = agendamentos.map(a => {
            const statusClass = a.status === 'agendado' ? 'status-agendado' :
                                a.status === 'realizado' ? 'status-realizado' :
                                'status-cancelado';
            const descricaoStatus = STATUSES_FIXOS.find(status => status.id === a.status)?.descricao || a.status;

            return `
                <div class="resultado-lista ${statusClass}">
                    <strong>ID:</strong> ${a.id}<br>
                    <strong>Cidadão:</strong> ${a.paciente_nome}<br>
                    <strong>Vacina:</strong> ${a.vacina_nome}<br>
                    <strong>Posto:</strong> ${a.posto_nome}<br>
                    <strong>Status:</strong> <span class="status-badge">${descricaoStatus}</span><br>
                    <strong>Data/Hora:</strong> ${formatarDataHora(a.data_agendamento)}
                </div>
            `;
        }).join('');

    } catch (erro) {
        lista.innerHTML = `<p class="error">Erro ao carregar agendamentos: ${erro.message}</p>`;
    }
}


function atualizarCampoDoseRealizada() {
    const status = document.getElementById('novoStatusAgendamento');
    const container = document.getElementById('doseRealizadaContainer');
    const dose = document.getElementById('doseRealizada');
    if (!status || !container || !dose) return;
    const exigeDose = status.value === 'realizado';
    container.style.display = exigeDose ? 'block' : 'none';
    dose.required = exigeDose;
    if (!exigeDose) dose.value = '';
}

document.getElementById('novoStatusAgendamento')?.addEventListener('change', atualizarCampoDoseRealizada);

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
        const resposta = await fazerRequisicao('/agendamentos');
        const lista = resposta.data || [];
        const agendamento = lista.find(a => a.id == termo);

        if (!agendamento) {
            container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            document.getElementById('atualizarAgendamentoForm').style.display = 'none';
            return;
        }

        document.getElementById('idAgendamentoAtualizar').value = agendamento.id;
        document.getElementById('agendamentoSelecionadoAtualizar').innerText =
            `${agendamento.paciente_nome} - ${agendamento.vacina_nome}`;

        document.getElementById('atualizarAgendamentoForm').style.display = 'block';

        container.innerHTML = `
            <div class="resultado-lista">
                <strong>Cidadão:</strong> ${agendamento.paciente_nome}<br>
                <strong>Vacina:</strong> ${agendamento.vacina_nome}<br>
                <strong>Status Atual:</strong> ${STATUSES_FIXOS.find(s => s.id === agendamento.status)?.descricao || agendamento.status}<br>
                <strong>Data/Hora:</strong> ${formatarDataHora(agendamento.data_agendamento)}
            </div>
        `;

        const select = document.getElementById('novoStatusAgendamento');
        select.innerHTML = '<option value="">Selecione um status</option>';

        STATUSES_FIXOS.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.descricao;
            if (s.id === agendamento.status) opt.selected = true;
            select.appendChild(opt);
        });
        atualizarCampoDoseRealizada();

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
    const status = document.getElementById('novoStatusAgendamento').value;
    const dose = document.getElementById('doseRealizada').value.trim();

    if (!status) {
        mostrarMensagem('mensagemAgendamentoAtualizar', 'Selecione um status.', 'error');
        return;
    }

    try {
        if (status === 'realizado' && !dose) {
            mostrarMensagem('mensagemAgendamentoAtualizar', 'Informe a dose aplicada.', 'error');
            return;
        }

        await fazerRequisicao(`/agendamentos/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status, dose })
        });

        mostrarMensagem('mensagemAgendamentoAtualizar', 'Agendamento atualizado com sucesso!', 'success');

        if (window.desenharGrafico && window.fetchDadosGestao) {
            fetchDadosGestao();
        }

        document.getElementById('atualizarAgendamentoForm').style.display = 'none';
        document.getElementById('doseRealizada').value = '';
        document.getElementById('resultadoBuscaAgendamentoAtualizar').innerHTML = '';
        document.getElementById('buscarAgendamentoAtualizar').value = '';

        const secao14 = document.getElementById('secao14');
        if (secao14 && secao14.classList.contains('active')) {
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
        const resposta = await fazerRequisicao('/agendamentos');
        const lista = resposta.data || [];
        const agendamento = lista.find(a => a.id == termo);

        if (!agendamento) {
            container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            document.getElementById('excluirAgendamentoForm').style.display = 'none';
            return;
        }

        if (agendamento.status === 'realizado') {
            container.innerHTML = `
                <div class="resultado-lista">
                    <p class="error">⚠️ Este agendamento está com status "Realizado" e não pode ser excluído.</p>
                    <strong>Cidadão:</strong> ${agendamento.paciente_nome}<br>
                    <strong>Vacina:</strong> ${agendamento.vacina_nome}<br>
                    <strong>Status:</strong> ${STATUSES_FIXOS.find(s => s.id === agendamento.status)?.descricao || agendamento.status}
                </div>
            `;
            document.getElementById('excluirAgendamentoForm').style.display = 'none';
            return;
        }

        document.getElementById('idAgendamentoExcluir').value = agendamento.id;
        document.getElementById('agendamentoSelecionadoExcluir').innerText =
            `${agendamento.paciente_nome} - ${agendamento.vacina_nome}`;

        document.getElementById('excluirAgendamentoForm').style.display = 'block';

        container.innerHTML = `
            <div class="resultado-lista">
                <strong>Cidadão:</strong> ${agendamento.paciente_nome}<br>
                <strong>Vacina:</strong> ${agendamento.vacina_nome}<br>
                <strong>Posto:</strong> ${agendamento.posto_nome}<br>
                <strong>Status:</strong> ${STATUSES_FIXOS.find(s => s.id === agendamento.status)?.descricao || agendamento.status}<br>
                <strong>Data/Hora:</strong> ${formatarDataHora(agendamento.data_agendamento)}
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

        const secao14 = document.getElementById('secao14');
        if (secao14 && secao14.classList.contains('active')) {
            listarAgendamentosDetalhados();
        }

    } catch (erro) {
        mostrarMensagem('mensagemAgendamentoExcluir', `Erro ao excluir agendamento: ${erro.message}`, 'error');
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

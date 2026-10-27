
function capitalizarNomeVisual(nome) {
    if (!nome) return nome;
    return nome
        .toLowerCase()
        .split(' ')
        .map(palavra =>
            palavra.length > 2
                ? palavra.charAt(0).toUpperCase() + palavra.slice(1)
                : palavra
        )
        .join(' ');
}

async function carregarMeuHistorico() {
    const container = document.getElementById('meuHistorico');
    if (!container) return;
    mostrarTexto(container, 'Carregando seu histórico...');
    try {
        const resposta = await fazerRequisicao('/historico/meu-historico');
        const registros = resposta.data || [];
        if (!registros.length) {
            mostrarTexto(container, 'Nenhuma vacina registrada até o momento.');
            return;
        }
        container.replaceChildren(...registros.map(registro => criarCartaoResultado([
            ['Vacina', registro.vacina_nome || 'Vacina'],
            ['Aplicação', formatarData(registro.data_aplicacao)],
            ['Dose', registro.dose || 'Não informada'],
            ['Lote', registro.vacina_lote || 'Não informado'],
            ['Profissional', registro.profissional_responsavel || 'Não informado']
        ], 'resultado-lista')));
    } catch (erro) {
        mostrarTexto(container, `Não foi possível carregar seu histórico: ${erro.message}`, 'error');
    }
}

function formatarData(valor) {
    if (!valor) return 'Não informada';
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function aplicarCapitalizacaoNoInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', () => {
        const posicaoCursor = input.selectionStart;
        input.value = capitalizarNomeVisual(input.value);
        input.setSelectionRange(posicaoCursor, posicaoCursor);
    });
}

aplicarCapitalizacaoNoInput('nome');
aplicarCapitalizacaoNoInput('novoNome');
aplicarCapitalizacaoNoInput('registroNome');

let isSubmittingCidadao = false;

async function cadastrarCidadao(e) {
    e.preventDefault();

    if (isSubmittingCidadao) {
        console.warn('Cadastro já em andamento. Aguarde...');
        return;
    }

    const submitButton = document.getElementById('cadastroCidadaoSbmt');

    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const data_nascimento = document.getElementById('dataNascimento').value;
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    const endereco = document.getElementById('endereco').value.trim();
    const cpfLimpo = cpf.replace(/\D/g, '');
    const telefoneLimpo = telefone.replace(/\D/g, '');

    if (!nome || !cpfLimpo || !data_nascimento || !telefoneLimpo || !email || !endereco) {
        mostrarMensagem('mensagem', 'Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    if (cpfLimpo.length !== 11) {
        mostrarMensagem('mensagem', 'CPF deve conter exatamente 11 números.', 'error');
        return;
    }

    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagem('mensagem', 'Telefone deve conter entre 10 e 11 números, incluindo o DDD.', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        mostrarMensagem('mensagem', 'Email inválido. Verifique o formato.', 'error');
        return;
    }

    const dados = {
        nome: nome,
        cpf: cpfLimpo,
        data_nascimento,
        telefone: telefoneLimpo,
        email: email,
        endereco: endereco
    };

    isSubmittingCidadao = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Cadastrando...';

    try {
        await fazerRequisicao('/pacientes', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagem', 'Cidadão cadastrado com sucesso!', 'success');
        document.getElementById('cadastroForm').reset();
        
        if (document.getElementById('secao2').classList.contains('active')) {
            listarCidadaos();
        }

    } catch (erro) {
        mostrarMensagem('mensagem', `Erro ao cadastrar cidadão: ${erro.message}`, 'error');
    } finally {
   
        isSubmittingCidadao = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Cadastrar';
    }
}

async function listarCidadaos() {
    const lista = document.getElementById('listaCidadaos');
    mostrarTexto(lista, 'Carregando...');

    try {
        const resposta = await fazerRequisicao('/pacientes');
        const cidadaos = resposta.data?.pacientes || [];

        if (!Array.isArray(cidadaos) || cidadaos.length === 0) {
            mostrarTexto(lista, 'Nenhum cidadão cadastrado.');
            return;
        }

        lista.replaceChildren(...cidadaos.map(cidadao => criarCartaoResultado([
            ['ID', cidadao.id], ['Nome', cidadao.nome], ['CPF', formatarCPF(cidadao.cpf)],
            ['Telefone', formatarTelefone(cidadao.telefone)], ['Email', cidadao.email], ['Endereço', cidadao.endereco]
        ])));

    } catch (erro) {
        mostrarTexto(lista, `Erro ao carregar cidadãos: ${erro.message}`, 'error');
    }
}

async function buscarCidadaoParaAtualizar() {
    const termo = document.getElementById('buscarCpfAtualizar').value.trim();
    
    if (!termo) {
        mostrarMensagem('mensagemAtualizar', 'Digite um CPF ou nome para buscar', 'error');
        return;
    }

    const container = document.getElementById('resultadoBuscaAtualizar');
    mostrarTexto(container, 'Buscando...');

    try {
        const resposta = await fazerRequisicao('/pacientes');
        const cidadaos = resposta.data?.pacientes || [];
        const termoLimpo = termo.replace(/\D/g, ''); 
        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termoLimpo) || 
            c.nome.toLowerCase().includes(termo.toLowerCase())
        );

        if (resultados.length === 0) {
            mostrarTexto(container, 'Nenhum cidadão encontrado.');
            document.getElementById('atualizarForm').style.display = 'none';
            return;
        }

        container.replaceChildren(...resultados.map(cidadao => criarBotaoResultado(
            `Nome: ${cidadao.nome} · CPF: ${formatarCPF(cidadao.cpf)}`,
            () => selecionarCidadaoParaAtualizar(cidadao.id, cidadao.nome, cidadao.cpf, cidadao.telefone, cidadao.email, cidadao.endereco)
        )));

    } catch (erro) {
        mostrarTexto(container, `Erro ao buscar cidadão: ${erro.message}`, 'error');
        mostrarMensagem('mensagemAtualizar', `Erro: ${erro.message}`, 'error');
    }
}

function selecionarCidadaoParaAtualizar(id, nome, cpf, telefone, email, endereco) {
    document.getElementById('idAtualizar').value = id;
    document.getElementById('novoNome').value = nome;
    document.getElementById('novoCpf').value = formatarCPF(cpf);
    document.getElementById('novoTelefone').value = formatarTelefone(telefone);
    document.getElementById('novoEmail').value = email;
    document.getElementById('novoEndereco').value = endereco;
    document.getElementById('atualizarForm').style.display = 'block';
    document.getElementById('atualizarForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function atualizarCidadao(e) {
    e.preventDefault();

    const id = document.getElementById('idAtualizar').value;
    const novoNome = document.getElementById('novoNome').value.trim();
    const novoCpf = document.getElementById('novoCpf').value.trim();
    const novoTelefone = document.getElementById('novoTelefone').value.trim();
    const novoEmail = document.getElementById('novoEmail').value.trim();
    const novoEndereco = document.getElementById('novoEndereco').value.trim();

    const dados = {};
    const cpfLimpo = novoCpf ? novoCpf.replace(/\D/g, '') : '';
    const telefoneLimpo = novoTelefone ? novoTelefone.replace(/\D/g, '') : '';

    if (novoCpf && cpfLimpo.length !== 11) {
        mostrarMensagem('mensagemAtualizar', 'CPF deve conter exatamente 11 números.', 'error');
        return;
    }

    if (novoTelefone && (telefoneLimpo.length < 10 || telefoneLimpo.length > 11)) {
        mostrarMensagem('mensagemAtualizar', 'Telefone deve conter entre 10 e 11 números, incluindo o DDD.', 'error');
        return;
    }

    if (novoEmail && (!novoEmail.includes('@') || !novoEmail.includes('.'))) {
        mostrarMensagem('mensagemAtualizar', 'Email inválido. Verifique o formato.', 'error');
        return;
    }

    if (novoNome) dados.nome = novoNome;
    if (cpfLimpo) dados.cpf = cpfLimpo;
    if (telefoneLimpo) dados.telefone = telefoneLimpo;
    if (novoEmail) dados.email = novoEmail;
    if (novoEndereco) dados.endereco = novoEndereco;

    if (Object.keys(dados).length === 0) {
        mostrarMensagem('mensagemAtualizar', 'Nenhum campo foi alterado.', 'error');
        return;
    }

    try {
        await fazerRequisicao(`/pacientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagemAtualizar', 'Cidadão atualizado com sucesso!', 'success');
        document.getElementById('atualizarForm').style.display = 'none';
        document.getElementById('resultadoBuscaAtualizar').replaceChildren();
        document.getElementById('buscarCpfAtualizar').value = '';

        if (document.getElementById('secao2').classList.contains('active')) {
            listarCidadaos();
        }

    } catch (erro) {
        mostrarMensagem('mensagemAtualizar', `Erro ao atualizar cidadão: ${erro.message}`, 'error');
    }
}

async function buscarCidadaoParaExcluir() {
    const termo = document.getElementById('buscarCpfExcluir').value.trim();
    
    if (!termo) {
        mostrarMensagem('mensagemExcluir', 'Digite um CPF ou nome para buscar', 'error');
        return;
    }

    const container = document.getElementById('resultadoBuscaExcluir');
    mostrarTexto(container, 'Buscando...');

    try {
        const resposta = await fazerRequisicao('/pacientes');
        const cidadaos = resposta.data?.pacientes || [];
        const termoLimpo = termo.replace(/\D/g, '');

        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termoLimpo) || 
            c.nome.toLowerCase().includes(termo.toLowerCase())
        );

        if (resultados.length === 0) {
            mostrarTexto(container, 'Nenhum cidadão encontrado.');
            document.getElementById('excluirForm').style.display = 'none';
            return;
        }

        container.replaceChildren(...resultados.map(cidadao => criarBotaoResultado(
            `Nome: ${cidadao.nome} · CPF: ${formatarCPF(cidadao.cpf)}`,
            () => selecionarCidadaoParaExcluir(cidadao.id, cidadao.nome)
        )));

    } catch (erro) {
        mostrarTexto(container, `Erro ao buscar cidadão: ${erro.message}`, 'error');
        mostrarMensagem('mensagemExcluir', `Erro: ${erro.message}`, 'error');
    }
}

function selecionarCidadaoParaExcluir(id, nome) {
    document.getElementById('idExcluir').value = id;
    document.getElementById('nomeSelecionadoExcluir').textContent = nome;
    document.getElementById('excluirForm').style.display = 'block';
    document.getElementById('excluirForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function excluirCidadao(e) {
    e.preventDefault();

    const confirmacao = confirm('⚠️ Tem certeza que deseja excluir este cidadão?\n\nEsta ação não pode ser desfeita!');
    if (!confirmacao) return;

    const id = document.getElementById('idExcluir').value;

    try {
        await fazerRequisicao(`/pacientes/${id}`, { method: 'DELETE' });

        mostrarMensagem('mensagemExcluir', 'Cidadão excluído com sucesso!', 'success');
        document.getElementById('excluirForm').style.display = 'none';
        document.getElementById('resultadoBuscaExcluir').replaceChildren();
        document.getElementById('buscarCpfExcluir').value = '';

        if (document.getElementById('secao2').classList.contains('active')) {
            listarCidadaos();
        }

    } catch (erro) {
        mostrarMensagem('mensagemExcluir', `Erro ao excluir cidadão: ${erro.message}`, 'error');
    }
}

function formatarCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarTelefone(telefone) {
    if (!telefone) return telefone;
    if (telefone.length === 11) {
        return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (telefone.length === 10) {
        return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return telefone;
}

window.selecionarCidadaoParaAtualizar = selecionarCidadaoParaAtualizar;
window.selecionarCidadaoParaExcluir = selecionarCidadaoParaExcluir;
window.cadastrarCidadao = cadastrarCidadao;
window.listarCidadaos = listarCidadaos;
window.buscarCidadaoParaAtualizar = buscarCidadaoParaAtualizar;
window.atualizarCidadao = atualizarCidadao;
window.buscarCidadaoParaExcluir = buscarCidadaoParaExcluir;
window.excluirCidadao = excluirCidadao;
window.carregarMeuHistorico = carregarMeuHistorico;

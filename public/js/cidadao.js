// ===== FUNÇÕES DE UTILIDADE =====
function capitalizarNomeVisual(nome) {
    if (!nome) return nome;
    return nome
        .toLowerCase()
        .split(' ')
        .map(palavra =>
            palavra.length > 2
                ? palavra.charAt(0).toUpperCase() + palavra.slice(1)
                : palavra // mantém "da", "de", "do" minúsculos
        )
        .join(' ');
}

function aplicarCapitalizacaoNoInput(inputId) {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => {
        const posicaoCursor = input.selectionStart;
        input.value = capitalizarNomeVisual(input.value);
        input.setSelectionRange(posicaoCursor, posicaoCursor);
    });
}

aplicarCapitalizacaoNoInput('nome');
aplicarCapitalizacaoNoInput('novoNome');

// ===== FUNÇÕES PARA CIDADÃOS =====

async function cadastrarCidadao(e) {
    e.preventDefault();
    const submitButton = document.getElementById('cadastroCidadaoSbmt');

    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    const endereco = document.getElementById('endereco').value.trim();

    const cpfLimpo = cpf.replace(/\D/g, '');
    const telefoneLimpo = telefone.replace(/\D/g, '');

    if (!nome || !cpfLimpo || !telefoneLimpo || !email || !endereco) {
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

    const dados = {
        nome: nome,
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
        email: email,
        endereco: endereco
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Cadastrando...';

    try {
        await fazerRequisicao('/cidadaos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagem', 'Cidadão cadastrado com sucesso!', 'success');
        document.getElementById('cadastroForm').reset();
        listarCidadaos();
    } catch (erro) {
        mostrarMensagem('mensagem', `Erro ao cadastrar cidadão: ${erro.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Cadastrar';
    }
}

async function listarCidadaos() {
    try {
        const cidadaos = await fazerRequisicao('/cidadaos');
        const lista = document.getElementById('listaCidadaos');

        if (cidadaos.length === 0) {
            lista.innerHTML = '<p>Nenhum cidadão cadastrado.</p>';
            return;
        }

        lista.innerHTML = cidadaos.map(cidadao => `
            <div class="resultado-lista">
                <strong>ID:</strong> ${cidadao.id}<br>
                <strong>Nome:</strong> ${cidadao.nome}<br>
                <strong>CPF:</strong> ${cidadao.cpf}<br>
                <strong>Telefone:</strong> ${cidadao.telefone}<br>
                <strong>Email:</strong> ${cidadao.email}<br>
                <strong>Endereço:</strong> ${cidadao.endereco}
            </div>
        `).join('');
    } catch (erro) {
        document.getElementById('listaCidadaos').innerHTML = `<p class="error">Erro ao carregar cidadãos: ${erro.message}</p>`;
    }
}

// ===== ATUALIZAÇÃO DE CIDADÃO =====
async function buscarCidadaoParaAtualizar() {
    const termo = document.getElementById('buscarCpfAtualizar').value.trim();
    if (!termo) {
        mostrarMensagem('mensagemAtualizar', 'Digite um CPF ou nome para buscar', 'error');
        return;
    }

    try {
        const cidadaos = await fazerRequisicao('/cidadaos');
        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termo) || c.nome.toLowerCase().includes(termo.toLowerCase())
        );

        const container = document.getElementById('resultadoBuscaAtualizar');

        if (resultados.length === 0) {
            container.innerHTML = '<p>Nenhum cidadão encontrado.</p>';
            return;
        }

        container.innerHTML = resultados.map(cidadao => `
            <div class="resultado-lista" onclick="selecionarCidadaoParaAtualizar(${cidadao.id}, '${cidadao.nome}', '${cidadao.cpf}', '${cidadao.telefone}', '${cidadao.email}', '${cidadao.endereco}')">
                <strong>Nome:</strong> ${cidadao.nome}<br>
                <strong>CPF:</strong> ${cidadao.cpf}
            </div>
        `).join('');
    } catch (erro) {
        mostrarMensagem('mensagemAtualizar', `Erro ao buscar cidadão: ${erro.message}`, 'error');
    }
}

function selecionarCidadaoParaAtualizar(id, nome, cpf, telefone, email, endereco) {
    document.getElementById('idAtualizar').value = id;
    document.getElementById('novoNome').value = nome;
    document.getElementById('novoCpf').value = cpf;
    document.getElementById('novoTelefone').value = telefone;
    document.getElementById('novoEmail').value = email;
    document.getElementById('novoEndereco').value = endereco;
    document.getElementById('atualizarForm').style.display = 'block';
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

    if (novoNome) dados.nome = novoNome;
    if (cpfLimpo) dados.cpf = cpfLimpo;
    if (telefoneLimpo) dados.telefone = telefoneLimpo;
    if (novoEmail) dados.email = novoEmail;
    if (novoEndereco) dados.endereco = novoEndereco;

    try {
        await fazerRequisicao(`/cidadaos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagemAtualizar', 'Cidadão atualizado com sucesso!', 'success');
        document.getElementById('atualizarForm').style.display = 'none';
        document.getElementById('resultadoBuscaAtualizar').innerHTML = '';
    } catch (erro) {
        mostrarMensagem('mensagemAtualizar', `Erro ao atualizar cidadão: ${erro.message}`, 'error');
    }
}

// ===== EXCLUSÃO DE CIDADÃO =====
async function buscarCidadaoParaExcluir() {
    const termo = document.getElementById('buscarCpfExcluir').value.trim();
    if (!termo) {
        mostrarMensagem('mensagemExcluir', 'Digite um CPF ou nome para buscar', 'error');
        return;
    }

    try {
        const cidadaos = await fazerRequisicao('/cidadaos');
        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termo) || c.nome.toLowerCase().includes(termo.toLowerCase())
        );

        const container = document.getElementById('resultadoBuscaExcluir');
        if (resultados.length === 0) {
            container.innerHTML = '<p>Nenhum cidadão encontrado.</p>';
            return;
        }

        container.innerHTML = resultados.map(cidadao => `
            <div class="resultado-lista" onclick="selecionarCidadaoParaExcluir(${cidadao.id}, '${cidadao.nome}')">
                <strong>Nome:</strong> ${cidadao.nome}<br>
                <strong>CPF:</strong> ${cidadao.cpf}
            </div>
        `).join('');
    } catch (erro) {
        mostrarMensagem('mensagemExcluir', `Erro ao buscar cidadão: ${erro.message}`, 'error');
    }
}

function selecionarCidadaoParaExcluir(id, nome) {
    document.getElementById('idExcluir').value = id;
    document.getElementById('nomeSelecionadoExcluir').textContent = nome;
    document.getElementById('excluirForm').style.display = 'block';
}

async function excluirCidadao(e) {
    e.preventDefault();
    const confirmacao = confirm('Tem certeza que deseja excluir este cidadão?');
    if (!confirmacao) return;

    const id = document.getElementById('idExcluir').value;

    try {
        await fazerRequisicao(`/cidadaos/${id}`, { method: 'DELETE' });
        mostrarMensagem('mensagemExcluir', 'Cidadão excluído com sucesso!', 'success');
        document.getElementById('excluirForm').style.display = 'none';
        document.getElementById('resultadoBuscaExcluir').innerHTML = '';
    } catch (erro) {
        mostrarMensagem('mensagemExcluir', `Erro ao excluir cidadão: ${erro.message}`, 'error');
    }
}

// Expondo funções globais para HTML
window.selecionarCidadaoParaAtualizar = selecionarCidadaoParaAtualizar;
window.selecionarCidadaoParaExcluir = selecionarCidadaoParaExcluir;

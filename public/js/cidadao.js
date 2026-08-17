
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

    if (!email.includes('@') || !email.includes('.')) {
        mostrarMensagem('mensagem', 'Email inválido. Verifique o formato.', 'error');
        return;
    }

    const dados = {
        nome: nome,
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
        email: email,
        endereco: endereco
    };

    isSubmittingCidadao = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Cadastrando...';

    try {
        await fazerRequisicao('/cidadaos', {
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
    lista.innerHTML = '<p>Carregando...</p>';

    try {
        const cidadaos = await fazerRequisicao('/cidadaos');

        if (!Array.isArray(cidadaos) || cidadaos.length === 0) {
            lista.innerHTML = '<p>Nenhum cidadão cadastrado.</p>';
            return;
        }

        lista.innerHTML = cidadaos.map(cidadao => `
            <div class="resultado-lista">
                <strong>ID:</strong> ${cidadao.id}<br>
                <strong>Nome:</strong> ${cidadao.nome}<br>
                <strong>CPF:</strong> ${formatarCPF(cidadao.cpf)}<br>
                <strong>Telefone:</strong> ${formatarTelefone(cidadao.telefone)}<br>
                <strong>Email:</strong> ${cidadao.email}<br>
                <strong>Endereço:</strong> ${cidadao.endereco}
            </div>
        `).join('');

    } catch (erro) {
        lista.innerHTML = `<p class="error">Erro ao carregar cidadãos: ${erro.message}</p>`;
    }
}

async function buscarCidadaoParaAtualizar() {
    const termo = document.getElementById('buscarCpfAtualizar').value.trim();
    
    if (!termo) {
        mostrarMensagem('mensagemAtualizar', 'Digite um CPF ou nome para buscar', 'error');
        return;
    }

    const container = document.getElementById('resultadoBuscaAtualizar');
    container.innerHTML = '<p>Buscando...</p>';

    try {
        const cidadaos = await fazerRequisicao('/cidadaos');
        const termoLimpo = termo.replace(/\D/g, ''); 
        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termoLimpo) || 
            c.nome.toLowerCase().includes(termo.toLowerCase())
        );

        if (resultados.length === 0) {
            container.innerHTML = '<p>Nenhum cidadão encontrado.</p>';
            document.getElementById('atualizarForm').style.display = 'none';
            return;
        }

        container.innerHTML = resultados.map(cidadao => `
            <div class="resultado-lista" onclick="selecionarCidadaoParaAtualizar(${cidadao.id}, '${escapeHtml(cidadao.nome)}', '${cidadao.cpf}', '${cidadao.telefone}', '${escapeHtml(cidadao.email)}', '${escapeHtml(cidadao.endereco)}')">
                <strong>Nome:</strong> ${cidadao.nome}<br>
                <strong>CPF:</strong> ${formatarCPF(cidadao.cpf)}
            </div>
        `).join('');

    } catch (erro) {
        container.innerHTML = `<p class="error">Erro ao buscar cidadão: ${erro.message}</p>`;
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
        await fazerRequisicao(`/cidadaos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });

        mostrarMensagem('mensagemAtualizar', 'Cidadão atualizado com sucesso!', 'success');
        document.getElementById('atualizarForm').style.display = 'none';
        document.getElementById('resultadoBuscaAtualizar').innerHTML = '';
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
    container.innerHTML = '<p>Buscando...</p>';

    try {
        const cidadaos = await fazerRequisicao('/cidadaos');
        const termoLimpo = termo.replace(/\D/g, '');

        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termoLimpo) || 
            c.nome.toLowerCase().includes(termo.toLowerCase())
        );

        if (resultados.length === 0) {
            container.innerHTML = '<p>Nenhum cidadão encontrado.</p>';
            document.getElementById('excluirForm').style.display = 'none';
            return;
        }

        container.innerHTML = resultados.map(cidadao => `
            <div class="resultado-lista" onclick="selecionarCidadaoParaExcluir(${cidadao.id}, '${escapeHtml(cidadao.nome)}')">
                <strong>Nome:</strong> ${cidadao.nome}<br>
                <strong>CPF:</strong> ${formatarCPF(cidadao.cpf)}
            </div>
        `).join('');

    } catch (erro) {
        container.innerHTML = `<p class="error">Erro ao buscar cidadão: ${erro.message}</p>`;
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
        await fazerRequisicao(`/cidadaos/${id}`, { method: 'DELETE' });

        mostrarMensagem('mensagemExcluir', 'Cidadão excluído com sucesso!', 'success');
        document.getElementById('excluirForm').style.display = 'none';
        document.getElementById('resultadoBuscaExcluir').innerHTML = '';
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

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

window.selecionarCidadaoParaAtualizar = selecionarCidadaoParaAtualizar;
window.selecionarCidadaoParaExcluir = selecionarCidadaoParaExcluir;
window.cadastrarCidadao = cadastrarCidadao;
window.listarCidadaos = listarCidadaos;
window.buscarCidadaoParaAtualizar = buscarCidadaoParaAtualizar;
window.atualizarCidadao = atualizarCidadao;
window.buscarCidadaoParaExcluir = buscarCidadaoParaExcluir;
window.excluirCidadao = excluirCidadao;
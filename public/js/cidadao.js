// ===== FUNÇÕES PARA CIDADÃOS =====

       async function cadastrarCidadao(e) {
    // Evita o comportamento padrão de recarregar a página
    e.preventDefault();

    // Referência para o botão de envio
    const submitButton = document.getElementById('cadastroCidadaoSbmt');
    
    // Obtém os valores dos campos
    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    const endereco = document.getElementById('endereco').value.trim();

    // Remove os caracteres de máscara antes de validar e enviar
    const cpfLimpo = cpf.replace(/\D/g, '');
    const telefoneLimpo = telefone.replace(/\D/g, '');

    // Validações básicas antes de continuar
    if (!nome || !cpfLimpo || !telefoneLimpo || !email || !endereco) {
        mostrarMensagem('mensagem', 'Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    if (cpfLimpo.length !== 11) {
        mostrarMensagem('mensagem', 'CPF deve conter exatamente 11 números.', 'error');
        return;
    }

    // Validação de telefone para 10 ou 11 dígitos
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagem('mensagem', 'Telefone deve conter entre 10 e 11 números, incluindo o DDD.', 'error');
        return;
    }

    // Objeto de dados para o envio à API, usando os valores limpos
    const dados = {
        nome: nome,
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
        email: email,
        endereco: endereco
    };

    // Desabilita o botão para evitar múltiplos cliques
    submitButton.disabled = true;
    submitButton.textContent = 'Cadastrando...';

    try {
        // Envia a requisição POST para a API
        await fazerRequisicao('/cidadaos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        // Exibe mensagem de sucesso e limpa o formulário
        mostrarMensagem('mensagem', 'Cidadão cadastrado com sucesso!', 'success');
        document.getElementById('cadastroForm').reset();
        listarCidadaos();

    } catch (erro) {
        // Em caso de erro, exibe a mensagem de erro da requisição
        mostrarMensagem('mensagem', `Erro ao cadastrar cidadão: ${erro.message}`, 'error');
    } finally {
        // Habilita o botão novamente
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

        async function buscarCidadaoParaAtualizar() {
            const termo = document.getElementById('buscarCpfAtualizar').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemAtualizar', 'Digite um CPF ou nome para buscar', 'error');
                return;
            }

            try {
                const cidadaos = await fazerRequisicao('/cidadaos');
                const resultados = cidadaos.filter(c =>
                    c.cpf.includes(termo) ||
                    c.nome.toLowerCase().includes(termo.toLowerCase())
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
    // Impede o envio padrão do formulário
    e.preventDefault();

    const id = document.getElementById('idAtualizar').value;
    const novoNome = document.getElementById('novoNome').value.trim();
    const novoCpf = document.getElementById('novoCpf').value.trim();
    const novoTelefone = document.getElementById('novoTelefone').value.trim();
    const novoEmail = document.getElementById('novoEmail').value.trim();
    const novoEndereco = document.getElementById('novoEndereco').value.trim();

    // Cria um objeto para enviar apenas os dados que foram preenchidos
    const dados = {};

    // Limpa o CPF e o telefone, se existirem, antes da validação
    const cpfLimpo = novoCpf ? novoCpf.replace(/\D/g, '') : '';
    const telefoneLimpo = novoTelefone ? novoTelefone.replace(/\D/g, '') : '';

    // Valida o CPF apenas se o campo foi preenchido
    if (novoCpf && cpfLimpo.length !== 11) {
        mostrarMensagem('mensagemAtualizar', 'CPF deve conter exatamente 11 números.', 'error');
        return;
    }

    // Valida o telefone apenas se o campo foi preenchido
    if (novoTelefone && (telefoneLimpo.length < 10 || telefoneLimpo.length > 11)) {
        mostrarMensagem('mensagemAtualizar', 'Telefone deve conter entre 10 e 11 números, incluindo o DDD.', 'error');
        return;
    }

    // Adiciona ao objeto 'dados' apenas os campos que foram preenchidos
    if (novoNome) dados.nome = novoNome;
    if (cpfLimpo) dados.cpf = cpfLimpo; // Usa a versão limpa
    if (telefoneLimpo) dados.telefone = telefoneLimpo; // Usa a versão limpa
    if (novoEmail) dados.email = novoEmail;
    if (novoEndereco) dados.endereco = novoEndereco;

    try {
        // Envia a requisição PUT para a API
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
      // ===== FUNÇÕES PARA A SEÇÃO DE EXCLUSÃO DE CIDADÃO =====

// Função para buscar um cidadão por CPF ou nome
async function buscarCidadaoParaExcluir() {
    const termo = document.getElementById('buscarCpfExcluir').value.trim();
    if (!termo) {
        mostrarMensagem('mensagemExcluir', 'Digite um CPF ou nome para buscar', 'error');
        return;
    }

    try {
        const cidadaos = await fazerRequisicao('/cidadaos');
        const resultados = cidadaos.filter(c =>
            c.cpf.includes(termo) ||
            c.nome.toLowerCase().includes(termo.toLowerCase())
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

// Função para selecionar o cidadão e exibir o formulário de exclusão
function selecionarCidadaoParaExcluir(id, nome) {
    document.getElementById('idExcluir').value = id;
    document.getElementById('nomeSelecionadoExcluir').textContent = nome;
    document.getElementById('excluirForm').style.display = 'block';
}

// Função para excluir o cidadão selecionado
async function excluirCidadao(e) {
    // Impede o envio padrão do formulário, que recarregaria a página.
    e.preventDefault();

    // Exibe um pop-up de confirmação para o usuário.
    const confirmacao = confirm('Tem certeza que deseja excluir este cidadão?');

    // Se o usuário clicar em "Cancelar", a função é interrompida.
    if (!confirmacao) {
        return;
    }

    // Se o usuário confirmar a exclusão, a lógica continua.
    const id = document.getElementById('idExcluir').value;

    try {
        // Envia uma requisição DELETE para a API usando o ID do cidadão.
        await fazerRequisicao(`/cidadaos/${id}`, {
            method: 'DELETE'
        });

        // Exibe uma mensagem de sucesso na interface do usuário.
        mostrarMensagem('mensagemExcluir', 'Cidadão excluído com sucesso!', 'success');
        
        // Esconde o formulário de exclusão.
        document.getElementById('excluirForm').style.display = 'none';

        // Limpa a área de busca para evitar informações incorretas.
        document.getElementById('resultadoBuscaExcluir').innerHTML = '';

    } catch (erro) {
        // Em caso de erro, exibe uma mensagem com a descrição do problema.
        mostrarMensagem('mensagemExcluir', `Erro ao excluir cidadão: ${erro.message}`, 'error');
    }
}

window.selecionarCidadaoParaAtualizar = selecionarCidadaoParaAtualizar;
window.selecionarCidadaoParaExcluir = selecionarCidadaoParaExcluir;
// ===== FUNÇÕES PARA POSTOS DE SAÚDE =====

        async function cadastrarPosto(e) {
            e.preventDefault();

            const dados = {
                nome: document.getElementById('nomePosto').value,
                endereco: document.getElementById('enderecoPosto').value
            };

            try {
                await fazerRequisicao('/postos', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });

                mostrarMensagem('mensagemPosto', 'Posto cadastrado com sucesso!', 'success');
                document.getElementById('cadastroPostoForm').reset();
            } catch (erro) {
                mostrarMensagem('mensagemPosto', `Erro ao cadastrar posto: ${erro.message}`, 'error');
            }
        }

        async function listarPostos() {
            try {
                const postos = await fazerRequisicao('/postos');
                const lista = document.getElementById('listaPostos');

                if (postos.length === 0) {
                    lista.innerHTML = '<p>Nenhum posto cadastrado.</p>';
                    return;
                }

                lista.innerHTML = postos.map(posto => `
                    <div class="resultado-lista">
                        <strong>ID:</strong> ${posto.id}<br>
                        <strong>Nome:</strong> ${posto.nome}<br>
                        <strong>Endereço:</strong> ${posto.endereco}
                    </div>
                `).join('');
            } catch (erro) {
                document.getElementById('listaPostos').innerHTML = `<p class="error">Erro ao carregar postos: ${erro.message}</p>`;
            }
        }

        async function buscarPostoParaAtualizar() {
            const termo = document.getElementById('buscarPostoAtualizar').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemPostoAtualizar', 'Digite um nome para buscar', 'error');
                return;
            }

            try {
                const postos = await fazerRequisicao('/postos');
                const resultados = postos.filter(p =>
                    p.nome.toLowerCase().includes(termo.toLowerCase())
                );

                const container = document.getElementById('resultadoBuscaPostoAtualizar');

                if (resultados.length === 0) {
                    container.innerHTML = '<p>Nenhum posto encontrado.</p>';
                    return;
                }

                container.innerHTML = resultados.map(posto => `
                    <div class="resultado-lista" onclick="selecionarPostoParaAtualizar(${posto.id}, '${posto.nome}', '${posto.endereco}')">
                        <strong>Nome:</strong> ${posto.nome}<br>
                        <strong>Endereço:</strong> ${posto.endereco}
                    </div>
                `).join('');
            } catch (erro) {
                mostrarMensagem('mensagemPostoAtualizar', `Erro ao buscar posto: ${erro.message}`, 'error');
            }
        }

        function selecionarPostoParaAtualizar(id, nome, endereco) {
            document.getElementById('idPostoAtualizar').value = id;
            document.getElementById('novoNomePosto').value = nome;
            document.getElementById('novoEnderecoPosto').value = endereco;
            document.getElementById('atualizarPostoForm').style.display = 'block';
        }

        async function atualizarPosto(e) {
            e.preventDefault();

            const id = document.getElementById('idPostoAtualizar').value;
            const dados = {};

            const novoNome = document.getElementById('novoNomePosto').value.trim();
            const novoEndereco = document.getElementById('novoEnderecoPosto').value.trim();

            if (novoNome) dados.nome = novoNome;
            if (novoEndereco) dados.endereco = novoEndereco;

            try {
                await fazerRequisicao(`/postos/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });

                mostrarMensagem('mensagemPostoAtualizar', 'Posto atualizado com sucesso!', 'success');
                document.getElementById('atualizarPostoForm').style.display = 'none';
                document.getElementById('resultadoBuscaPostoAtualizar').innerHTML = '';
            } catch (erro) {
                mostrarMensagem('mensagemPostoAtualizar', `Erro ao atualizar posto: ${erro.message}`, 'error');
            }
        }

        async function buscarPostoParaExcluir() {
            const termo = document.getElementById('buscarPostoExcluir').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemPostoExcluir', 'Digite um nome para buscar', 'error');
                return;
            }

            try {
                const postos = await fazerRequisicao('/postos');
                const resultados = postos.filter(p =>
                    p.nome.toLowerCase().includes(termo.toLowerCase())
                );

                const container = document.getElementById('resultadoBuscaPostoExcluir');

                if (resultados.length === 0) {
                    container.innerHTML = '<p>Nenhum posto encontrado.</p>';
                    return;
                }

                container.innerHTML = resultados.map(posto => `
                    <div class="resultado-lista" onclick="selecionarPostoParaExcluir(${posto.id}, '${posto.nome}')">
                        <strong>Nome:</strong> ${posto.nome}<br>
                        <strong>Endereço:</strong> ${posto.endereco}
                    </div>
                `).join('');
            } catch (erro) {
                mostrarMensagem('mensagemPostoExcluir', `Erro ao buscar posto: ${erro.message}`, 'error');
            }
        }

        function selecionarPostoParaExcluir(id, nome) {
            document.getElementById('idPostoExcluir').value = id;
            document.getElementById('nomeSelecionadoPostoExcluir').textContent = nome;
            document.getElementById('excluirPostoForm').style.display = 'block';
        }

       async function excluirPosto(e) {

    e.preventDefault();

    const confirmacao = confirm('Tem certeza que deseja excluir este posto de saúde?');

    if (!confirmacao) {
        return;
    }
    
    const id = document.getElementById('idPostoExcluir').value;

    try {
        // Envia a requisição DELETE para a API.
        await fazerRequisicao(`/postos/${id}`, {
            method: 'DELETE'
        });

        mostrarMensagem('mensagemPostoExcluir', 'Posto excluído com sucesso!', 'success');
        
        document.getElementById('excluirPostoForm').style.display = 'none';
        document.getElementById('resultadoBuscaPostoExcluir').innerHTML = '';

    } catch (erro) {
        mostrarMensagem('mensagemPostoExcluir', `Erro ao excluir posto: ${erro.message}`, 'error');
    }
}

window.selecionarPostoParaAtualizar = selecionarPostoParaAtualizar;
window.selecionarPostoParaExcluir = selecionarPostoParaExcluir;
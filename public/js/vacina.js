 // ===== FUNÇÕES PARA VACINAS =====

async function cadastrarVacina(e) {
    e.preventDefault();
    
    const postoIdElement = document.getElementById('postoId');
    const postoIdValue = postoIdElement ? postoIdElement.value.trim() : null;

    const dados = {
        nome: document.getElementById('nomeVacina').value,
        fabricante: document.getElementById('fabricanteVacina').value,
        validade: document.getElementById('validadeVacina').value,
        
        postoId: parseInt(postoIdValue) || 1 // Usa o ID capturado, ou 1 como fallback se for null/vazio.
    };
    
    if (!dados.nome || !dados.fabricante || !dados.validade || !dados.postoId) {
        mostrarMensagem('mensagemVacina', 'Erro: Nome, fabricante, validade e Posto ID são obrigatórios (Verifique o HTML se o Posto ID estiver faltando).', 'error');
        return;
    }
    
    // O resto da sua lógica de requisição permanece igual
    try {
        await fazerRequisicao('/vacinas', {
            method: 'POST',
            body: JSON.stringify(dados),
            // Adicione Headers se o fazerRequisicao não os estiver adicionando
            headers: {
                 'Content-Type': 'application/json'
            }
        });

        mostrarMensagem('mensagemVacina', 'Vacina cadastrada com sucesso!', 'success');
        document.getElementById('cadastroVacinaForm').reset();
    } catch (erro) {
        mostrarMensagem('mensagemVacina', `Erro ao cadastrar vacina: ${erro.message}`, 'error');
    }
}
        async function listarVacinas() {
            try {
                const vacinas = await fazerRequisicao('/vacinas');
                const lista = document.getElementById('listaVacinas');

                if (vacinas.length === 0) {
                    lista.innerHTML = '<p>Nenhuma vacina cadastrada.</p>';
                    return;
                }

                lista.innerHTML = vacinas.map(vacina => `
                    <div class="resultado-lista">
                        <strong>ID:</strong> ${vacina.id}<br>
                        <strong>Nome:</strong> ${vacina.nome}<br>
                        <strong>Fabricante:</strong> ${vacina.fabricante}<br>
                        <strong>Validade:</strong> ${vacina.validade}
                    </div>
                `).join('');
            } catch (erro) {
                document.getElementById('listaVacinas').innerHTML = `<p class="error">Erro ao carregar vacinas: ${erro.message}</p>`;
            }
        }

        async function buscarVacinaParaAtualizar() {
            const termo = document.getElementById('buscarVacinaAtualizar').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemVacinaAtualizar', 'Digite um nome ou fabricante para buscar', 'error');
                return;
            }

            try {
                const vacinas = await fazerRequisicao('/vacinas');
                const resultados = vacinas.filter(v =>
                    v.nome.toLowerCase().includes(termo.toLowerCase()) ||
                    v.fabricante.toLowerCase().includes(termo.toLowerCase())
                );

                const container = document.getElementById('resultadoBuscaVacinaAtualizar');

                if (resultados.length === 0) {
                    container.innerHTML = '<p>Nenhuma vacina encontrada.</p>';
                    return;
                }

                container.innerHTML = resultados.map(vacina => `
                    <div class="resultado-lista" onclick="selecionarVacinaParaAtualizar(${vacina.id}, '${vacina.nome}', '${vacina.fabricante}', '${vacina.validade}')">
                        <strong>Nome:</strong> ${vacina.nome}<br>
                        <strong>Fabricante:</strong> ${vacina.fabricante}
                    </div>
                `).join('');
            } catch (erro) {
                mostrarMensagem('mensagemVacinaAtualizar', `Erro ao buscar vacina: ${erro.message}`, 'error');
            }
        }

        function selecionarVacinaParaAtualizar(id, nome, fabricante, validade) {
            document.getElementById('idVacinaAtualizar').value = id;
            document.getElementById('novoNomeVacina').value = nome;
            document.getElementById('novoFabricanteVacina').value = fabricante;
            document.getElementById('novaValidadeVacina').value = validade;
            document.getElementById('atualizarVacinaForm').style.display = 'block';
        }

        async function atualizarVacina(e) {
            e.preventDefault();

            const id = document.getElementById('idVacinaAtualizar').value;
            const dados = {};

            const novoNome = document.getElementById('novoNomeVacina').value.trim();
            const novoFabricante = document.getElementById('novoFabricanteVacina').value.trim();
            const novaValidade = document.getElementById('novaValidadeVacina').value.trim();

            if (novoNome) dados.nome = novoNome;
            if (novoFabricante) dados.fabricante = novoFabricante;
            if (novaValidade) dados.validade = novaValidade;

            try {
                await fazerRequisicao(`/vacinas/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });

                mostrarMensagem('mensagemVacinaAtualizar', 'Vacina atualizada com sucesso!', 'success');
                document.getElementById('atualizarVacinaForm').style.display = 'none';
                document.getElementById('resultadoBuscaVacinaAtualizar').innerHTML = '';
            } catch (erro) {
                mostrarMensagem('mensagemVacinaAtualizar', `Erro ao atualizar vacina: ${erro.message}`, 'error');
            }
        }

        async function buscarVacinaParaExcluir() {
            const termo = document.getElementById('buscarVacinaExcluir').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemVacinaExcluir', 'Digite um nome ou fabricante para buscar', 'error');
                return;
            }

            try {
                const vacinas = await fazerRequisicao('/vacinas');
                const resultados = vacinas.filter(v =>
                    v.nome.toLowerCase().includes(termo.toLowerCase()) ||
                    v.fabricante.toLowerCase().includes(termo.toLowerCase())
                );

                const container = document.getElementById('resultadoBuscaVacinaExcluir');

                if (resultados.length === 0) {
                    container.innerHTML = '<p>Nenhuma vacina encontrada.</p>';
                    return;
                }

                container.innerHTML = resultados.map(vacina => `
                    <div class="resultado-lista" onclick="selecionarVacinaParaExcluir(${vacina.id}, '${vacina.nome}')">
                        <strong>Nome:</strong> ${vacina.nome}<br>
                        <strong>Fabricante:</strong> ${vacina.fabricante}
                    </div>
                `).join('');
            } catch (erro) {
                mostrarMensagem('mensagemVacinaExcluir', `Erro ao buscar vacina: ${erro.message}`, 'error');
            }
        }

        function selecionarVacinaParaExcluir(id, nome) {
            document.getElementById('idVacinaExcluir').value = id;
            document.getElementById('nomeSelecionadoVacinaExcluir').textContent = nome;
            document.getElementById('excluirVacinaForm').style.display = 'block';
        }

        async function excluirVacina(e) {
    e.preventDefault();
    const confirmacao = confirm('Tem certeza que deseja excluir esta vacina?');

    if (!confirmacao) {
        return; 
    }

    const id = document.getElementById('idVacinaExcluir').value;

    try {
        await fazerRequisicao(`/vacinas/${id}`, {
            method: 'DELETE'
        });

        mostrarMensagem('mensagemVacinaExcluir', 'Vacina excluída com sucesso!', 'success');
        
        document.getElementById('excluirVacinaForm').style.display = 'none';

        document.getElementById('resultadoBuscaVacinaExcluir').innerHTML = '';

    } catch (erro) {
        mostrarMensagem('mensagemVacinaExcluir', `Erro ao excluir vacina: ${erro.message}`, 'error');
    }
}

window.selecionarVacinaParaAtualizar = selecionarVacinaParaAtualizar;
window.selecionarVacinaParaExcluir = selecionarVacinaParaExcluir;
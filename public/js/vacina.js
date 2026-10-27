function normalizarListaVacinas(resposta) {
    if (Array.isArray(resposta)) return resposta;
    if (Array.isArray(resposta?.data?.vacinas)) return resposta.data.vacinas;
    if (Array.isArray(resposta?.data)) return resposta.data;
    return [];
}

 async function cadastrarVacina(e) {
    e.preventDefault();
    
    const postoIdElement = document.getElementById('postoId');
    const postoIdValue = postoIdElement ? postoIdElement.value.trim() : null;

    const dados = {
        nome: document.getElementById('nomeVacina').value,
        fabricante: document.getElementById('fabricanteVacina').value,
        validade: document.getElementById('validadeVacina').value,
        lote: document.getElementById('loteVacina').value.trim() || null,
        quantidade_estoque: Number(document.getElementById('quantidadeEstoqueVacina').value),
        minimo_alerta: Number(document.getElementById('minimoAlertaVacina').value),
        postoId: parseInt(postoIdValue) || 1 
    };
    
    if (!dados.nome || !Number.isInteger(dados.quantidade_estoque) || dados.quantidade_estoque < 0 || !Number.isInteger(dados.minimo_alerta) || dados.minimo_alerta < 0) {
        mostrarMensagem('mensagemVacina', 'Informe o nome e quantidades inteiras iguais ou maiores que zero.', 'error');
        return;
    }
    
    try {
        await fazerRequisicao('/vacinas', {
            method: 'POST',
            body: JSON.stringify(dados),
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
                const vacinas = normalizarListaVacinas(await fazerRequisicao('/vacinas'));
                const lista = document.getElementById('listaVacinas');

                if (vacinas.length === 0) {
                    mostrarTexto(lista, 'Nenhuma vacina cadastrada.');
                    return;
                }

                lista.replaceChildren(...vacinas.map(vacina => criarCartaoResultado([
                    ['ID', vacina.id], ['Nome', vacina.nome], ['Fabricante', vacina.fabricante], ['Validade', vacina.validade]
                ])));
            } catch (erro) {
                mostrarTexto(document.getElementById('listaVacinas'), `Erro ao carregar vacinas: ${erro.message}`, 'error');
            }
        }

        async function buscarVacinaParaAtualizar() {
            const termo = document.getElementById('buscarVacinaAtualizar').value.trim();
            if (!termo) {
                mostrarMensagem('mensagemVacinaAtualizar', 'Digite um nome ou fabricante para buscar', 'error');
                return;
            }

            try {
                const vacinas = normalizarListaVacinas(await fazerRequisicao('/vacinas'));
                const resultados = vacinas.filter(v =>
                    v.nome.toLowerCase().includes(termo.toLowerCase()) ||
                    (v.fabricante || '').toLowerCase().includes(termo.toLowerCase())
                );

                const container = document.getElementById('resultadoBuscaVacinaAtualizar');

                if (resultados.length === 0) {
                    mostrarTexto(container, 'Nenhuma vacina encontrada.');
                    return;
                }

                container.replaceChildren(...resultados.map(vacina => {
                    const botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'resultado-lista';
                    botao.style.width = '100%';
                    botao.textContent = `Nome: ${vacina.nome} · Fabricante: ${vacina.fabricante || 'não informado'}`;
                    botao.addEventListener('click', () => selecionarVacinaParaAtualizar(
                        vacina.id, vacina.nome, vacina.fabricante || '', vacina.validade || '', vacina.lote || '',
                        Number(vacina.quantidade_estoque || 0), Number(vacina.minimo_alerta || 0)
                    ));
                    return botao;
                }));
            } catch (erro) {
                mostrarMensagem('mensagemVacinaAtualizar', `Erro ao buscar vacina: ${erro.message}`, 'error');
            }
        }

        function selecionarVacinaParaAtualizar(id, nome, fabricante, validade, lote = '', quantidade = 0, minimo = 0) {
            document.getElementById('idVacinaAtualizar').value = id;
            document.getElementById('novoNomeVacina').value = nome;
            document.getElementById('novoFabricanteVacina').value = fabricante;
            document.getElementById('novaValidadeVacina').value = validade;
            document.getElementById('novoLoteVacina').value = lote || '';
            document.getElementById('novaQuantidadeEstoqueVacina').value = quantidade;
            document.getElementById('novoMinimoAlertaVacina').value = minimo;
            document.getElementById('atualizarVacinaForm').style.display = 'block';
        }

        async function atualizarVacina(e) {
            e.preventDefault();

            const id = document.getElementById('idVacinaAtualizar').value;
            const dados = {};

            const novoNome = document.getElementById('novoNomeVacina').value.trim();
            const novoFabricante = document.getElementById('novoFabricanteVacina').value.trim();
            const novaValidade = document.getElementById('novaValidadeVacina').value.trim();
            const novoLote = document.getElementById('novoLoteVacina').value.trim();
            const novaQuantidade = document.getElementById('novaQuantidadeEstoqueVacina').value;
            const novoMinimo = document.getElementById('novoMinimoAlertaVacina').value;

            if (novoNome) dados.nome = novoNome;
            if (novoFabricante) dados.fabricante = novoFabricante;
            if (novaValidade) dados.validade = novaValidade;
            if (novoLote) dados.lote = novoLote;
            if (novaQuantidade !== '') dados.quantidade_estoque = Number(novaQuantidade);
            if (novoMinimo !== '') dados.minimo_alerta = Number(novoMinimo);

            try {
                await fazerRequisicao(`/vacinas/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });

                mostrarMensagem('mensagemVacinaAtualizar', 'Vacina atualizada com sucesso!', 'success');
                document.getElementById('atualizarVacinaForm').style.display = 'none';
                document.getElementById('resultadoBuscaVacinaAtualizar').replaceChildren();
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
                const vacinas = normalizarListaVacinas(await fazerRequisicao('/vacinas'));
                const resultados = vacinas.filter(v =>
                    v.nome.toLowerCase().includes(termo.toLowerCase()) ||
                    (v.fabricante || '').toLowerCase().includes(termo.toLowerCase())
                );

                const container = document.getElementById('resultadoBuscaVacinaExcluir');

                if (resultados.length === 0) {
                    mostrarTexto(container, 'Nenhuma vacina encontrada.');
                    return;
                }

                container.replaceChildren(...resultados.map(vacina => criarBotaoResultado(
                    `Nome: ${vacina.nome} · Fabricante: ${vacina.fabricante || 'não informado'}`,
                    () => selecionarVacinaParaExcluir(vacina.id, vacina.nome)
                )));
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

        document.getElementById('resultadoBuscaVacinaExcluir').replaceChildren();

    } catch (erro) {
        mostrarMensagem('mensagemVacinaExcluir', `Erro ao excluir vacina: ${erro.message}`, 'error');
    }
}

window.selecionarVacinaParaAtualizar = selecionarVacinaParaAtualizar;
window.selecionarVacinaParaExcluir = selecionarVacinaParaExcluir;

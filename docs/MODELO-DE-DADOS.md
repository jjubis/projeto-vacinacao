# Modelo de dados

O banco é SQLite (`vacinacao.db` por padrão, configurável por `DATABASE_PATH`) e seu esquema é inicializado em `index.js`. Este documento descreve o modelo efetivamente criado pela aplicação; não é uma migração executável.

| Tabela | Campos principais | Observações |
| --- | --- | --- |
| `cidadaos` | `id`, `nome`, `cpf`, `telefone`, `email`, `endereco` | `cpf` é único no schema; rota também trata telefone e e-mail como únicos |
| `usuarios` | `id`, `nome`, `email`, `senhaHash`, `papel`, `cidadaoId`, `criadoEm` | `papel` é `cidadao` ou `funcionario`; `cidadaoId` liga o login cidadão ao cadastro |
| `vacinas` | `id`, `nome`, `fabricante`, `validade` | Não há unicidade de nome/fabricante no schema |
| `postos_saude` | `id`, `nome`, `endereco` | Unidade que mantém estoque e recebe agendamentos |
| `estoque` | `postoId`, `vacinaId`, `quantidade` | Chave primária composta (`postoId`, `vacinaId`) |
| `statuses` | `id`, `descricao` | Dados iniciais: 1 Agendado, 2 Realizado, 3 Cancelado |
| `agendamentos` | `id`, `cidadaoId`, `vacinaId`, `postoId`, `statusId`, `dataHora` | Único por (`cidadaoId`, `vacinaId`) |
| `historico_vacinal` | `id`, `cidadaoId`, `vacinaId`, `dataAplicacao`, `agendamentoId` | Um histórico por agendamento realizado (`agendamentoId` único) |

## Relações

```text
cidadaos 1 ── 0..1 usuarios       (usuarios.cidadaoId)
cidadaos 1 ── N agendamentos
vacinas  1 ── N agendamentos
postos   1 ── N agendamentos
statuses 1 ── N agendamentos
postos   N ── N vacinas           (estoque)
agendamentos 1 ── 0..1 historico_vacinal
```

As FKs declaradas para cidadão, vacina e posto usam `ON DELETE CASCADE`; `statusId` referencia `statuses` sem cascade. A conexão principal habilita explicitamente `PRAGMA foreign_keys = ON`, portanto essas restrições são aplicadas. Antes de alterar uma exclusão ou a unicidade de `agendamentos`, confirme o impacto no histórico e no fluxo de reagendamento. Em particular, para cidadãos, prefira uma futura coluna de inativação/arquivamento à remoção física, preservando rastreabilidade de dados de saúde.

## Dados iniciais

Na primeira inicialização, o servidor insere os três status, um cidadão, uma vacina, um posto, 10 doses para a primeira combinação posto/vacina e um agendamento de exemplo. Esse bootstrap só ocorre quando cada tabela correspondente está vazia.

# Modelo de dados

## Banco usado pela aplicação

A configuração ativa é MySQL via `mysql2/promise` (`config/database.js`). Este documento registra os nomes de tabelas e colunas referenciados pelo código atual. **Não é o DDL completo do banco**: a instância real não foi inspecionada e o repositório não inclui migração para todo o esquema principal.

| Tabela | Colunas referenciadas | Uso observado |
| --- | --- | --- |
| `usuarios` | `id`, `nome`, `cpf`, `email`, `senha_hash`, `papel`, `paciente_id` | Login, papel e associação do cidadão ao paciente. |
| `pacientes` | `id`, `nome`, `cpf`, `data_nascimento`, `telefone`, `email`, `endereco` | Cadastro e dados do cidadão/paciente. |
| `vacinas` | `id`, `nome`, `fabricante`, `quantidade_estoque`, `validade`, `lote`, `minimo_alerta` | Catálogo, estoque e informações de lote/validade usadas nos alertas. |
| `postos_saude` | `id`, `nome`, `endereco` | Unidades ligadas a agendamentos. |
| `agendamentos` | `id`, `paciente_id`, `vacina_id`, `posto_id`, `status`, `data_agendamento` | Reservas de vacinação e seu estado. |
| `historico_vacinal` | `id`, `paciente_id`, `vacina_id`, `lote`, `data_aplicacao`, `dose`, `profissional_responsavel` | Registros de aplicações realizadas. |
| `notificacoes` | `id`, `destinatario_id`, `categoria`, `titulo`, `mensagem`, `chave_unica`, `lida_em`, `criada_em` | Notificações por usuário e estado de leitura. Criada pela inicialização atual. |
| `notificacoes_alertas_estado` | `chave_alerta`, `ativo`, `versao`, `atualizado_em` | Estado e reincidência dos alertas periódicos. Criada pela inicialização atual. |

Os nomes e campos acima foram conferidos nas consultas e operações dos modelos/serviços; isso não confirma tipos SQL, índices, constraints, chaves estrangeiras ou nulabilidade do banco instalado.

## Relações usadas pelo código

```text
usuarios.paciente_id ──> pacientes.id
agendamentos.paciente_id ──> pacientes.id
agendamentos.vacina_id ──> vacinas.id
agendamentos.posto_id ──> postos_saude.id
historico_vacinal.paciente_id ──> pacientes.id
historico_vacinal.vacina_id ──> vacinas.id
notificacoes.destinatario_id ──> usuarios.id (associação lógica usada pela API)
```

As relações acima descrevem como as consultas ligam os registros. Não se afirma que todas estejam declaradas como foreign keys no banco físico.

## Estoque, lotes e datas

O serviço de vacinas lê e grava a quantidade no campo `vacinas.quantidade_estoque`; não há evidência no código ativo de uma tabela separada de estoque por posto. O limite de alerta é `vacinas.minimo_alerta`.

As consultas e telas de vacina também referenciam `lote` e `validade`. A rotina de alertas verifica validade até 30 dias antes e lotes vencidos. Confirme que esses campos existem no banco do projeto antes de executar a rotina.

## Migrações

Na inicialização, `inicializarNotificacoes()` executa `CREATE TABLE IF NOT EXISTS` para `notificacoes` e `notificacoes_alertas_estado`. Não altera nem apaga as tabelas existentes. O usuário MySQL da aplicação precisa ter permissão para criar essas tabelas.

Não há uma migração equivalente no repositório para criar ou converter o restante do esquema. Não importe o modelo SQLite antigo como se fosse o esquema MySQL atual; obtenha o DDL ou dump aprovado do banco de desenvolvimento e compare-o com as consultas da aplicação.

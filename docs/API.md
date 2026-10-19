# Contrato da API

## Convenções

- A aplicação Express monta as rotas em `/auth`, `/pacientes`, `/vacinas`, `/postos`, `/agendamentos`, `/historico` e `/notificacoes`.
- A autenticação implementada usa `Authorization: Bearer <token>`; o JWT contém `id`, `email`, `papel` e, para cidadãos, `paciente_id`.
- As respostas não são uniformes: vários controllers retornam `{ success, message, data }`, enquanto outros retornam lista ou campos no nível superior. Consulte o controller do endpoint ao integrar um cliente.
- A classificação abaixo descreve os middlewares presentes no código atual, não o nível de proteção recomendado.

## Autenticação — `/auth`

| Método e rota | Proteção atual | Entrada/resultado observado |
| --- | --- | --- |
| `POST /auth/cadastro` | Pública | Cadastro de cidadão; recebe dados como `nome`, `cpf`, `email`, `senha`, `dataNascimento` e `telefone`. |
| `POST /auth/login` | Pública | `{ email, senha }`; retorna o token e o usuário dentro de `data`. |
| `POST /auth/admin/cadastrar-funcionario` | Sem middleware de autenticação no router atual | Usa o cadastro com papel `funcionario`. Deve ser protegido antes de exposição pública. |
| `GET /auth/funcionarios` | Sem middleware de autenticação no router atual | Lista funcionários. Deve ser protegido conforme a política do sistema. |

Não há rotas `/auth/me` ou `/auth/logout` no router atual.

## Pacientes — `/pacientes`

Todas as rotas abaixo exigem JWT e papel `funcionario`.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /pacientes` | Lista pacientes. |
| `GET /pacientes/:id` | Busca paciente por ID. |
| `POST /pacientes` | Exige `nome`, `cpf`, `data_nascimento`, `logradouro`, `numero`, `bairro`, `cidade`, `uf` e `cep`. |
| `PUT /pacientes/:id` | Exige os mesmos campos obrigatórios da criação na validação atual. |
| `DELETE /pacientes/:id` | Remove o paciente. |

## Vacinas — `/vacinas`

O router atual não aplica middleware de autenticação nessas rotas.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /vacinas` | Retorna `{ success, data: { total, vacinas } }`. |
| `GET /vacinas/:id` | Busca vacina por ID. |
| `POST /vacinas` | Exige `nome` e `quantidade_estoque`; aceita `fabricante`, `validade`, `lote` e `minimo_alerta`. Quantidades devem ser zero ou maiores. |
| `PUT /vacinas/:id` | Atualização parcial; campos omitidos são preservados. |
| `DELETE /vacinas/:id` | Remove vacina. |

Os alertas usam `quantidade_estoque` e `minimo_alerta`; alertas de validade dependem de `validade` e, quando informado, `lote`.

## Postos — `/postos`

O router atual não aplica middleware de autenticação.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /postos` | Lista postos. |
| `GET /postos/:id` | Busca posto por ID. |
| `POST /postos` | Exige `nome` e `endereco`. |
| `PUT /postos/:id` | A validação atual exige `nome` e `endereco`. |
| `DELETE /postos/:id` | Remove posto. |

## Agendamentos — `/agendamentos`

| Método e rota | Proteção atual | Entrada/resultado |
| --- | --- | --- |
| `GET /agendamentos/meus-agendamentos` | JWT | Lista agendamentos associados ao usuário. O controller atual usa `req.usuario.id` como ID do paciente; confirme/corrija para `paciente_id` antes de considerar esse endpoint validado para cidadãos. |
| `GET /agendamentos` | JWT + `funcionario` | Lista agendamentos. |
| `GET /agendamentos/:id` | Sem middleware de autenticação | Busca por ID. Deve receber proteção adequada. |
| `POST /agendamentos` | JWT | Exige `paciente_id`, `vacina_id`, `posto_id`, `data_agendamento`. Para cidadãos, o serviço substitui o paciente enviado pelo `paciente_id` do JWT. |
| `PUT /agendamentos/:id` | JWT, sem verificação de papel no router | O serviço recebe status em texto: `agendado`, `realizado` ou `cancelado`. |
| `DELETE /agendamentos/:id` | JWT, sem verificação de papel no router | Exclui o agendamento após busca. |

Criação, atualização e exclusão emitem notificações conforme os eventos tratados nos controllers. As regras de disponibilidade e transição devem ser verificadas contra o esquema e os dados reais do MySQL.

## Histórico vacinal — `/historico`

O router atual não aplica middleware de autenticação.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /historico` | Lista histórico. |
| `GET /historico/paciente/:pacienteId` | Lista histórico do paciente. |
| `POST /historico` | Exige `paciente_id`, `vacina_id`, `data_aplicacao`, `dose` e `profissional_responsavel`; `lote` também é aceito pelo serviço. |
| `GET /historico/carteirinha/:pacienteId` | Retorna dados do paciente e histórico. |

## Notificações — `/notificacoes`

Todas as rotas exigem JWT. O usuário destinatário é sempre obtido de `req.usuario.id`, nunca do corpo ou query string.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /notificacoes` | Lista até 100 notificações do usuário. Aceita `?naoLidas=true`. Funcionários podem filtrar com `?categoria=estoque`, `validade`, `agendamento`, `cancelamento` ou `cadastro`; para cidadãos, o filtro é ignorado. |
| `GET /notificacoes/nao-lidas/contagem` | Retorna `{ success, total }`. |
| `PATCH /notificacoes/:id/lida` | Marca como lida somente se a notificação pertencer ao usuário autenticado. |
| `PATCH /notificacoes/ler-todas` | Marca como lidas todas as notificações do usuário autenticado. |

## Erros e validação

O middleware de autenticação retorna `401` para token ausente/inválido e `403` para papel sem permissão quando `requireRole` está aplicado. Erros e envelopes variam entre rotas legadas; não presuma uma estrutura única para todas as respostas.

## Observação de segurança

Há endpoints de vacinas, postos, histórico, funcionários e consulta individual de agendamento sem autenticação explícita nos routers atuais. Esta documentação registra o comportamento encontrado, não recomenda que esses endpoints permaneçam públicos. Revise a autorização antes de expor o backend.

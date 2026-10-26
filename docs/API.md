# Contrato da API

## Convenções

- A aplicação Express monta as rotas em `/auth`, `/pacientes` (também disponíveis pelo alias `/cidadaos`), `/vacinas`, `/postos`, `/agendamentos`, `/historico` e `/notificacoes`.
- A autenticação implementada usa `Authorization: Bearer <token>`; o JWT contém `id`, `email`, `papel` e, para cidadãos, `paciente_id`.
- As respostas não são uniformes: vários controllers retornam `{ success, message, data }`, enquanto outros retornam lista ou campos no nível superior. Consulte o controller do endpoint ao integrar um cliente.
- A classificação abaixo descreve os middlewares presentes no código atual, não o nível de proteção recomendado.

## Autenticação — `/auth`

| Método e rota | Proteção atual | Entrada/resultado observado |
| --- | --- | --- |
| `POST /auth/cadastro` | Pública | Ativa o acesso do cidadão já cadastrado pelo funcionário; recebe `nome`, `cpf`, `email` e `senha`. Nome e email devem corresponder ao cadastro. |
| `POST /auth/login` | Pública | `{ email, senha }`; retorna o token e o usuário dentro de `data`. |
| `GET /auth/me` | JWT | Retorna os dados atuais do usuario autenticado. |
| `POST /auth/admin/cadastrar-funcionario` | JWT + `funcionario` | Cria uma conta de funcionário. |
| `GET /auth/funcionarios` | JWT + `funcionario` | Lista funcionários. |

O endpoint `/auth/me` valida o token e retorna o perfil atual. O logout local remove o JWT do navegador; tokens copiados continuam validos ate expirarem.

## Pacientes — `/pacientes`

Todas as rotas abaixo exigem JWT e papel `funcionario`.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /pacientes` | Lista pacientes. |
| `GET /pacientes/:id` | Busca paciente por ID. |
| `POST /pacientes` | Exige `nome`, `cpf`, `data_nascimento`, `telefone`, `email` e `endereco`; cria paciente e conta cidadã vinculada, pendente de ativação de senha. |
| `PUT /pacientes/:id` | Exige `nome`, `cpf`, `telefone`, `email` e `endereco`; sincroniza os dados da conta cidadã vinculada. |
| `DELETE /pacientes/:id` | Remove o paciente. |

## Vacinas — `/vacinas`

Leituras exigem JWT; criacao, atualizacao e exclusao exigem papel `funcionario`.

| Método e rota | Entrada/resultado |
| --- | --- |
| `GET /vacinas` | Retorna `{ success, data: { total, vacinas } }`. |
| `GET /vacinas/:id` | Busca vacina por ID. |
| `POST /vacinas` | Exige `nome` e `quantidade_estoque`; aceita `fabricante`, `validade`, `lote` e `minimo_alerta`. Quantidades devem ser zero ou maiores. |
| `PUT /vacinas/:id` | Atualização parcial; campos omitidos são preservados. |
| `DELETE /vacinas/:id` | Remove vacina. |

Os alertas usam `quantidade_estoque` e `minimo_alerta`; alertas de validade dependem de `validade` e, quando informado, `lote`.

## Postos — `/postos`

Leituras exigem JWT; criacao, atualizacao e exclusao exigem papel `funcionario`.

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
| `GET /agendamentos/meus-agendamentos` | JWT + `cidadao` | Lista somente os agendamentos do `paciente_id` autenticado. |
| `GET /agendamentos` | JWT + `funcionario` | Lista agendamentos. |
| `GET /agendamentos/:id` | JWT | Funcionarios consultam qualquer registro; cidadaos somente o proprio. |
| `POST /agendamentos` | JWT + `cidadao` ou `funcionario` | Exige `paciente_id`, `vacina_id`, `posto_id`, `data_agendamento`; para cidadao, o servico substitui `paciente_id` pelo vinculo do token. |
| `PUT /agendamentos/:id` | JWT + `funcionario` | Atualiza o status do agendamento. |
| `DELETE /agendamentos/:id` | JWT + `funcionario` | Exclui o agendamento. |

Criação, atualização e exclusão emitem notificações conforme os eventos tratados nos controllers. As regras de disponibilidade e transição devem ser verificadas contra o esquema e os dados reais do MySQL.

## Histórico vacinal — `/historico`

Consultas administrativas e gravacao exigem JWT + `funcionario`. `/historico/meu-historico` usa o paciente associado ao token; a carteirinha aceita funcionario ou o proprio cidadao.

| Metodo e rota | Protecao | Entrada/resultado |
| --- | --- | --- |
| --- | --- |
| `GET /historico` | JWT + `funcionario` | Lista o historico para uso administrativo. |
| `GET /historico/meu-historico` | JWT + `cidadao` | Lista somente o historico vinculado a conta autenticada. |
| `GET /historico/paciente/:pacienteId` | JWT + `funcionario` | Consulta o historico de um paciente. |
| `POST /historico` | JWT + `funcionario` | Registra vacinacao. |
| `GET /historico/carteirinha/:pacienteId` | JWT | Funcionario ou o proprio cidadao. |

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

## Observacao de seguranca

O middleware valida o JWT e recarrega o papel e o vinculo do usuario no MySQL em cada requisicao autenticada. Mantenha testes de papel e propriedade ao alterar rotas.

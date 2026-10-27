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
| `DELETE /pacientes/:id` | Inativa o acesso e registra data e funcionário responsável. Preserva cadastro, agendamentos e histórico vacinal. |
| `GET /pacientes/inativos` | Lista cidadãos com acesso inativo para revisão pela equipe. |
| `PATCH /pacientes/:id/reativar` | Reativa acesso de cidadão inativo. |
| `GET /pacientes/:id/auditoria` | Lista as mudanças de estado, funcionário responsável e horário. |

O endpoint de exclusão não apaga dados: a política deste sistema é reter o cadastro e a trilha de saúde após inativar a conta. Não existe expurgo automático; o controlador dos dados deve definir e documentar o prazo aplicável antes de qualquer eliminação. A conta inativa não pode entrar, usar token antigo ou ser selecionada para novos agendamentos. A equipe pode reativar a conta pelo endpoint dedicado.

### Solicitações de eliminação

| Método e rota | Proteção e comportamento |
| --- | --- |
| `POST /pacientes/minha-solicitacao-eliminacao` | JWT + `cidadao`; registra pedido do titular autenticado. |
| `GET /pacientes/solicitacoes-eliminacao` | JWT + `funcionario`; consulta fila, prazos e decisões. |
| `PATCH /pacientes/solicitacoes-eliminacao/:solicitacaoId` | JWT + `funcionario`; aprova ou recusa com justificativa. Pedidos antes do prazo ficam aguardando. |
| `POST /pacientes/solicitacoes-eliminacao/:solicitacaoId/concluir` | JWT + `funcionario`; elimina após revalidar prazo mínimo e agendamentos pendentes. |

`DELETE /pacientes/:id` continua apenas inativando o acesso. A regra técnica conserva o histórico vacinal por no mínimo 20 anos desde a última aplicação. A eliminação exige pedido registrado, análise, justificativa e aprovação; não há expurgo automático. Consulte `docs/POLITICA-DE-RETENCAO.md` e confirme a aplicação do prazo com o controlador dos dados.

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
| `POST /agendamentos` | JWT + `cidadao` ou `funcionario` | Exige `vacina_id`, `posto_id` e `data_agendamento` (`YYYY-MM-DDTHH:mm`); funcionario também informa `paciente_id`, enquanto para cidadao o vínculo vem do token. |
| `PUT /agendamentos/:id` | JWT + `funcionario` | Recebe `status` (`agendado`, `realizado` ou `cancelado`). Para `realizado`, exige `dose`; estoque e histórico vacinal são atualizados na mesma transação. |
| `DELETE /agendamentos/:id` | JWT + `funcionario` | Exclui somente agendamentos não realizados; aplicações concluídas são preservadas no histórico. |

O horário é interpretado no fuso `America/Sao_Paulo`; a unidade atende em dias úteis, das 08h às 17h. A confirmação de uma aplicação verifica estoque e validade do lote e grava, atomicamente, o status, a baixa de uma dose e o histórico com dose, lote, data brasileira e profissional autenticado.

## Histórico vacinal — `/historico`

Todas as rotas de histórico exigem JWT. As consultas administrativas e o registro de vacinação são exclusivos de `funcionario`. O cidadão consulta o próprio histórico e a própria carteirinha por rotas sem parâmetro de paciente, usando o `paciente_id` associado à conta autenticada. A consulta por ID de paciente é exclusiva de funcionários.

| Método e rota | Proteção | Entrada/resultado |
| --- | --- | --- |
| `GET /historico` | JWT + `funcionario` | Lista o histórico para uso administrativo. |
| `GET /historico/meu-historico` | JWT + `cidadao` | Lista somente o histórico vinculado à conta autenticada. |
| `GET /historico/paciente/:pacienteId` | JWT + `funcionario` | Consulta o histórico de um paciente específico. |
| `POST /historico` | JWT + `funcionario` | Registra vacinação; exige `paciente_id`, `vacina_id`, `data_aplicacao`, `dose` e `profissional_responsavel`. |
| `GET /historico/minha-carteirinha` | JWT + `cidadao` | Retorna dados básicos do cidadão autenticado e seu histórico vacinal. |
| `GET /historico/carteirinha/:pacienteId` | JWT + `funcionario` | Retorna a carteirinha do paciente indicado. Cidadãos não podem usar esta rota. |

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

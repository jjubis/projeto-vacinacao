# Contrato da API

Base local: `http://localhost:3000` por padrão (ou a porta definida em `PORT`). A autenticação é por cookie de sessão; o cliente usa `credentials: 'include'`. Erros normalmente usam `{ "error": "..." }`.

Legenda: **P** = público; **A** = usuário autenticado; **C** = cidadão; **F** = funcionário.

| Método e rota | Acesso | Corpo/resultado principal |
| --- | --- | --- |
| `GET /` | P | Interface HTML |
| `GET /gestao/dados` | F | Totais e `vacinasEstoqueBaixo` (limiar `<= 4`) |
| `POST /auth/registrar` | P | `{ nome, email, senha, cpf }`; cria acesso de cidadão existente |
| `POST /auth/registrar-funcionario` | F | `{ nome, email, senha }` |
| `POST /auth/login` | P | `{ email, senha }`; retorna `usuario` e cria sessão; máximo de 5 tentativas/IP a cada 15 min |
| `POST /auth/logout` | P | Encerra a sessão atual |
| `GET /auth/me` | A | `{ usuario }` |
| `GET /cidadaos`, `GET /cidadaos/:id` | F | Lista/busca cidadãos |
| `POST /cidadaos` | F | `{ nome, cpf, telefone, email, endereco }` |
| `PUT /cidadaos/:id` | F | Qualquer subconjunto dos campos de cidadão |
| `DELETE /cidadaos/:id` | F | Exclui cidadão se permitido pelas FKs |
| `GET /vacinas`, `GET /vacinas/:id` | A | Lista/busca vacinas |
| `POST /vacinas` | F | `{ nome, fabricante, validade, postoId }`; cria vacina e 10 doses no posto |
| `PUT /vacinas/:id` | F | Subconjunto de `{ nome, fabricante, validade }` |
| `DELETE /vacinas/:id` | F | Exclui vacina se permitido pelas FKs |
| `GET /postos`, `GET /postos/:id` | A | Lista/busca postos |
| `POST /postos` | F | `{ nome, endereco }` |
| `PUT /postos/:id` | F | `{ nome?, endereco? }` |
| `DELETE /postos/:id` | F | Exclui posto se permitido pelas FKs |
| `GET /agendamentos/meus` | C | Agendamentos do cidadão da sessão, com dados relacionados |
| `GET /agendamentos` | F | Todos os agendamentos, com dados relacionados |
| `POST /agendamentos` | A | `{ vacinaId, postoId, dataHora, cidadaoId? }`; `cidadaoId` é obrigatório para F e ignorado para C |
| `PUT /agendamentos/:id` | F | `{ statusId }`, com transição e estoque/histórico conforme a regra |
| `DELETE /agendamentos/:id` | F | Não permite excluir realizado |

## Dados e formatos importantes

- `dataHora` é validada por `new Date(dataHora)` e comparada também como texto no conflito de horário. Mantenha um formato canônico consistente entre front-end e API (o cliente usa o valor de `datetime-local`).
- Datas de validade são passadas como string para SQLite.
- IDs devem ser inteiros. Para criação de agendamento a rota converte explicitamente os três IDs com `Number()`.
- Não dependa de uniformidade entre `message` e `mensagem`: as rotas legadas usam ambos. Padronize somente numa alteração de contrato planejada e coordenada.

## Códigos de resposta usuais

- `201`: recurso criado ou agendamento feito/reagendado.
- `400`: validação, horário inválido ou transição impossível.
- `401`: ausência/expiração de sessão.
- `403`: papel sem permissão.
- `404`: recurso inexistente.
- `409`: duplicidade, estoque/capacidade indisponível ou conflito de horário.
- `500`: erro inesperado.

# Contexto do projeto: Imuniza+

## Propósito e escopo

O Imuniza+ gerencia cidadãos, postos de saúde, vacinas, estoque e agendamentos de vacinação. Há dois perfis:

- **Cidadão**: cria o próprio acesso após ser previamente cadastrado por um funcionário; consulta vacinas e postos, agenda para si e consulta seus agendamentos.
- **Funcionário**: administra cidadãos, vacinas e postos; cria agendamentos para qualquer cidadão; acompanha indicadores; altera status e exclui agendamentos não realizados.

## Mapa técnico

| Área | Local | Responsabilidade |
| --- | --- | --- |
| Inicialização, schema e indicadores | `index.js` | Configura Express, sessão, SQLite, dados iniciais e `GET /gestao/dados` |
| Autenticação e autorização | `routes/authRoutes.js`, `utils/middlewares.js`, `utils/auth.js` | Login, cadastro, bcrypt, sessão e papéis |
| Domínio | `routes/*.js` | Validação e operações CRUD/negócio |
| Interface | `public/vacinacao.html`, `public/css/`, `public/js/` | Página única, telas e chamadas à API |
| Dados locais | `vacinacao.db` por padrão | SQLite em WAL; `DATABASE_PATH` permite isolar testes; ignorado pelo Git |
| Bootstrap de funcionário | `scripts/seedFuncionario.js` | Cria um funcionário padrão se não existir |

O processo inicia em `index.js`, abre o banco definido por `DATABASE_PATH` (ou `vacinacao.db`), executa a criação idempotente das tabelas/dados iniciais e monta as rotas. A interface é servida por `express.static('public')`; não há build, ORM, migrações ou framework de front-end.

## Como executar

1. Instale dependências: `npm install`.
2. Crie `.env` com `PORT=3000` (opcional) e um `SESSION_SECRET` forte.
3. Inicie: `npm start`.
4. Abra `http://localhost:3000`.

Para gerar o primeiro funcionário, com o servidor parado ou usando o mesmo banco inicializado, execute `node scripts/seedFuncionario.js`. As credenciais padrão estão no próprio script e devem ser trocadas/removidas antes de qualquer uso fora de desenvolvimento.

## Regras de negócio que não podem se perder

### Cadastro e acesso

- CPF é armazenado somente com 11 dígitos; telefone, somente com 10 ou 11 dígitos. Nome é capitalizado e e-mail normalizado para minúsculas no CRUD de cidadãos.
- Um cidadão só pode se autorregistrar se CPF e nome coincidirem com um registro de `cidadaos`; cada cidadão possui no máximo um login. E-mails de acesso são normalizados para minúsculas e comparados sem diferenciar maiúsculas/minúsculas.
- Senhas têm mínimo de 8 caracteres e são armazenadas via bcrypt (12 rounds).
- A sessão dura 2 horas. O objeto de sessão contém `id`, `nome`, `email`, `papel` e, para cidadão, `cidadaoId`.

### Agendamento, estoque e histórico

- Status possuem IDs fixos: `1 Agendado`, `2 Realizado`, `3 Cancelado`.
- Agendamento exige cidadão, vacina, posto e data/hora futura; apenas dias úteis, das 08:00 às 17:00, em intervalos de 30 minutos.
- Um posto só aceita um agendamento **Agendado** para cada horário. A capacidade por vacina/posto é o estoque físico menos os agendamentos pendentes.
- A restrição `UNIQUE(cidadaoId, vacinaId)` permite reaproveitar o mesmo registro ao reagendar algo cancelado, mas bloqueia segunda dose/novo agendamento da mesma vacina com o modelo atual.
- Ao mudar para **Realizado**, uma transação retira uma dose e insere `historico_vacinal`. Um realizado não pode voltar a outro status, nem ser excluído.
- Toda mudança de status deve ser validada. O retorno de **Cancelado** para **Agendado** revalida capacidade (estoque menos pendências) e conflito de horário antes de confirmar a transição.
- Exclusões e atualizações que afetem essas tabelas devem ser avaliadas junto às chaves estrangeiras e ao histórico.

## Fluxos críticos

1. Funcionário cadastra cidadão.
2. Cidadão cria acesso usando o mesmo CPF e nome.
3. Usuário autentica; o cookie de sessão é enviado com `credentials: 'include'`.
4. Cidadão ou funcionário cria agendamento. Para cidadão, a API ignora `cidadaoId` do corpo e usa o da sessão.
5. Funcionário marca como realizado; somente então o estoque é descontado e o histórico é criado.

## Riscos e dívida técnica observados

- O esquema é criado dentro de `index.js`; não existem migrações nem testes automatizados.
- IDs dos status são codificados na rota e pressupõem a ordem de inserção inicial da tabela `statuses`.
- O armazenamento de sessão padrão é em memória; não é apropriado para múltiplos processos ou reinicializações em produção.
- `cors()` é aberto e o cookie não é `secure`; revise ambos antes de publicar.
- Há textos com codificação exibida incorretamente no código-fonte. Preserve a codificação UTF-8 ao editar arquivos em português.
- O front-end possui renderizações com `innerHTML`. Como dados do sistema podem chegar a esses pontos, há risco de XSS se o escape não for uniforme; novas telas devem usar `textContent` e `addEventListener`, evitando dados dinâmicos em `onclick`.
- A rota de exclusão física de cidadãos é inadequada como política padrão para um domínio de saúde: pode afetar histórico e relacionamentos. Avaliar uma estratégia de inativação/arquivamento antes de evoluir esse fluxo.
- O script de seed contém uma senha conhecida, portanto não deve ser usado como provisionamento de produção.

## Checklist para mudanças

- Atualizar cliente e `docs/API.md` se o contrato de uma rota mudar.
- Tratar autorização no servidor, mesmo que a interface esconda uma opção.
- Para dados dinâmicos na interface, usar `textContent` e listeners programáticos; revisar e escapar valores se `innerHTML` for realmente necessário.
- Antes de excluir cidadãos, avaliar o impacto sobre dados clínicos e relacionamentos; preferir inativação quando a regra de negócio permitir.
- Executar operações de estoque/status/histórico na mesma transação.
- Validar o fluxo com os dois papéis quando alterar agendamentos ou sessão.
- Registrar aqui novas invariantes, decisão de arquitetura ou limitação relevante.

# Memória do projeto — Imuniza+

## Identidade

- Sistema local de vacinação em JavaScript ESM.
- Back-end: Express 5 + `better-sqlite3`.
- Front-end: página estática em `public/`, sem framework ou etapa de build.
- Banco local: `vacinacao.db`, em modo WAL.

## Onde procurar

- Inicialização, schema e indicadores: `index.js`.
- Regras de autenticação e sessão: `routes/authRoutes.js` e `utils/middlewares.js`.
- Regras críticas de agendamento: `routes/agendamentoRoutes.js`.
- Cliente HTTP e tratamento de sessão expirada: `public/js/api.js`.
- Contexto completo: `docs/CONTEXTO.md`.
- Contrato das rotas: `docs/API.md`.
- Estrutura do banco: `docs/MODELO-DE-DADOS.md`.

## Invariantes importantes

- Papéis válidos: `cidadao` e `funcionario`.
- Status: `1=Agendado`, `2=Realizado`, `3=Cancelado`.
- Cidadão só agenda para si; a API usa `cidadaoId` da sessão.
- Agendamentos: dias úteis, 08:00–17:00, em intervalos de 30 minutos.
- Não pode haver dois agendamentos pendentes no mesmo posto, data e hora.
- Capacidade disponível = estoque físico menos agendamentos pendentes da mesma vacina/posto.
- Ao realizar um agendamento, a transação desconta uma dose e registra o histórico vacinal.
- Agendamento realizado não pode mudar de status nem ser excluído.
- Há unicidade de `cidadaoId + vacinaId`; cancelamentos são reaproveitados ao reagendar.

## Convenções

- Preserve mensagens e documentação em português e arquivos em UTF-8.
- Use SQL parametrizado.
- Não altere contrato de rota sem atualizar front-end e `docs/API.md`.
- Mudanças em status, estoque e histórico devem ser atômicas.
- Não versionar `.env`, banco SQLite ou arquivos WAL/SHM.

## Estado e riscos conhecidos

- Não há testes automatizados nem sistema de migrações.
- O schema é criado em `index.js`; bancos existentes exigem atenção em qualquer mudança estrutural.
- Sessões ficam em memória; o cookie está com `secure: false`, apropriado apenas para desenvolvimento local.
- `cors()` está aberto; revisar antes de produção.
- `scripts/seedFuncionario.js` contém credenciais conhecidas para bootstrap e não serve como provisionamento de produção.

## Verificação mínima

```powershell
node --check index.js
npm start
```

Para alterações de agendamento, valide manualmente criação, cancelamento, realização, redução de estoque e consulta do histórico/indicadores com os dois papéis.

# Contexto para agentes

Este repositório é o **Imuniza+**, um sistema local de vacinação. É uma aplicação JavaScript ESM com Express 5, SQLite (`better-sqlite3`) e uma interface estática sem framework.

Leia `docs/CONTEXTO.md` antes de alterar regras de negócio e `docs/API.md` antes de alterar rotas ou integrações do front-end.

## Convenções de trabalho

- Preserve o português nas mensagens da interface e da API.
- Não versionar `.env`, `vacinacao.db`, nem seus arquivos `-wal`/`-shm`.
- Use consultas parametrizadas do `better-sqlite3`; mudanças coordenadas de estoque, histórico e status devem permanecer transacionais.
- Rotas retornam, em geral, `{ error }` para falhas e `{ message | mensagem, id }` para sucesso. Mantenha o contrato já consumido pelo front-end ao mudar uma rota.
- `public/js/api.js` centraliza `fetch`, JSON, cookie de sessão e o tratamento global de 401. Não replique essa lógica.
- Não presuma que IDs de status são intercambiáveis: `1=Agendado`, `2=Realizado`, `3=Cancelado` são regras atuais do domínio.
- Ao renderizar dados dinâmicos no front-end, prefira `textContent` e `addEventListener`. Não interpole dados do sistema em `innerHTML` ou em atributos HTML como `onclick`; se o uso de HTML for inevitável, aplique escape consistente a todos os valores.

## Verificação mínima

Após mudanças no servidor, execute `node --check index.js` e nos arquivos de rota alterados. Para validar fluxos críticos sem tocar no banco local, execute `npm run test:integration`. Para executar localmente, defina `SESSION_SECRET` no `.env` e use `npm start`.

## Pontos de atenção

- `index.js` cria e popula o esquema na inicialização; alterações de schema precisam considerar bancos já existentes.
- A sessão é armazenada em memória e o cookie usa `secure: false`: configuração adequada apenas ao ambiente local atual.
- Não há testes automatizados. Ao adicionar regra crítica, inclua testes ou descreva uma verificação manual em `docs/CONTEXTO.md`.

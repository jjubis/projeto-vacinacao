# Imuniza+

Sistema local de gestão de vacinação com cadastro de cidadãos, postos, vacinas, estoque, agendamentos e histórico vacinal.

## Início rápido

```powershell
npm install
npm start
```

Crie antes um arquivo `.env` a partir de `.env.example`, com `SESSION_SECRET` e, opcionalmente, `PORT`. A aplicação fica disponível em `http://localhost:3000` por padrão. O único banco padrão é `vacinacao.db`; para testes, defina `DATABASE_PATH` para um arquivo temporário isolado.

Consulte os documentos de manutenção antes de desenvolver:

- [Contexto, regras e arquitetura](docs/CONTEXTO.md)
- [Contrato da API](docs/API.md)
- [Modelo de dados](docs/MODELO-DE-DADOS.md)
- [Instruções para agentes e colaboradores](AGENTS.md)

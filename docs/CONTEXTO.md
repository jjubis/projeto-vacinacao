# Contexto do projeto: Imuniza+

## Fonte de verdade

A branch `arquitetura` é a linha de trabalho do projeto integrado. Esta documentação descreve o estado combinado do sistema nessa branch; não separa funcionalidades por autoria ou pela antiga divisão entre branches.

## Propósito e perfis

O Imuniza+ oferece operações de cadastro de pacientes, vacinas, postos de saúde, estoque, agendamentos e histórico vacinal. A autenticação usa JWT e os papéis esperados são `cidadao` e `funcionario`.

- **Cidadão:** possui conta vinculada a um registro em `pacientes`. Pode criar agendamento para si; o backend deve obter o paciente associado ao token, sem confiar no identificador enviado pelo navegador.
- **Funcionário:** administra cadastros e acompanha operações do sistema.

## Arquitetura observada no código

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Inicialização | `index.js`, `app.js` | Testa conexão MySQL, inicializa tabelas de notificações, monta rotas e inicia Express. |
| Banco | `config/database.js` | Pool assíncrono `mysql2/promise`; lê `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. |
| Autenticação | `routes/authRoutes.js`, `services/authService.js`, `middlewares/auth.js` | Cadastro, login, emissão e validação de JWT, autorização por papel. |
| API | `routes/`, `controllers/`, `services/`, `models/` | Endpoints, regras de negócio e consultas parametrizadas. |
| Interface | `public/vacinacao.html`, `public/css/`, `public/js/` | Aplicação web e chamadas HTTP ao backend. |
| Notificações | `services/notificacoesService.js`, `routes/notificacoesRoutes.js`, `controllers/notificacoesController.js` | Persistência, destinatários, consulta, leitura e alertas periódicos. |

O código ativo usa **MySQL**, não SQLite. `docs/MODELO-DE-DADOS.md` descreve as tabelas e colunas referenciadas pelas consultas atuais, mas o repositório não contém uma migração completa do esquema principal. A estrutura física do banco compartilhado ainda precisa ser confirmada com acesso à instância MySQL.

## Configuração e execução

1. Instale as dependências com `npm install`.
2. Configure `.env` com host, porta, usuário, senha, nome do banco e `JWT_SECRET`. Não compartilhe nem versione esse arquivo.
3. Garanta que o servidor MySQL esteja acessível e que o banco contenha o esquema principal esperado pela aplicação.
4. Inicie com `npm start` (`PORT` define a porta HTTP; o padrão do código é 4000).

O pool exige conexão TLS com validação de certificado (`ssl.rejectUnauthorized: true`). A aplicação não cria automaticamente as tabelas centrais de pacientes, usuários, vacinas, postos, agendamentos e histórico.

## Agendamentos e dados clínicos

Os status usados pelo serviço são `agendado`, `realizado` e `cancelado`. O modelo atual não contém regras suficientes para inferir intervalos entre doses ou um calendário por vacina. Portanto, notificações de próximas doses não são calculadas sem esses dados.

O fluxo de estoque e histórico existe em diferentes partes do código; antes de mudar suas transações ou regras, valide o esquema e o comportamento contra a instância MySQL de desenvolvimento. Não trate dados simulados como confirmação de funcionamento real.

## Central de notificações

- A tabela `notificacoes` é criada de forma aditiva durante a inicialização.
- `notificacoes_alertas_estado` registra alertas ativos de estoque e validade para evitar repetição a cada varredura.
- A desativação de cidadão mantém o cadastro e os registros clínicos; `usuarios.ativo`, `inativado_em` e `inativado_por` são adicionados pela migração `migrations/001_contas_cidadaos_inativacao.sql`.
- Eventos de agendamento e cadastro podem emitir notificações para o cidadão vinculado e para funcionários.
- Uma varredura ocorre ao iniciar e depois a cada 24 horas; operações de criação/edição de vacina também solicitam uma verificação.
- Alertas de validade dependem de `vacinas.validade` e, quando disponível, `vacinas.lote`.
- As rotas filtram e marcam notificações usando o usuário autenticado no JWT.

## Limitações conhecidas

- O schema MySQL de autenticacao, pacientes e agendamentos foi verificado na instancia de desenvolvimento; as demais regras de negocio ainda precisam de testes integrados.
- `npm test` executa quatro testes simulados de autorização do histórico; eles não substituem testes integrados no banco real.
- As rotas exigem autenticacao; operacoes administrativas exigem papel `funcionario`, e recursos do cidadao usam o `paciente_id` vinculado ao token.
- Há formatos de resposta diferentes entre controllers. Clientes devem seguir o envelope realmente retornado por cada endpoint.
- As telas que exibem dados da API criam elementos DOM e usam `textContent`; mantenha esse padrão e listeners programáticos para valores dinâmicos.
- O projeto não possui dados de calendário de doses suficientes para lembretes futuros confiáveis.

## Checklist de mudanças

- Atualizar `docs/API.md` quando contratos, caminhos, corpos ou permissões de rotas mudarem.
- Atualizar `docs/MODELO-DE-DADOS.md` quando consultas ou migrações alterarem tabelas/colunas.
- Validar autenticação e autorização no servidor, não apenas ocultar opções na interface.
- Testar eventos e operações persistentes em uma instância MySQL de desenvolvimento com esquema conhecido.
- Não afirmar que um teste integrado passou se foi executado somente com banco simulado.

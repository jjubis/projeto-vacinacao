# Política de retenção e eliminação de dados de cidadãos

## Regra técnica adotada

O sistema conserva o histórico de vacinação por, no mínimo, **20 anos contados da data da última aplicação registrada**. Uma solicitação de eliminação não apaga os dados automaticamente. Depois do prazo, o cadastro pode ser encaminhado para análise; prazo maior, obrigação legal, processo administrativo, interesse arquivístico ou outra retenção aplicável impedem a eliminação até a liberação formal.

A Lei 13.787/2018 permite que prontuários de pacientes sejam eliminados depois do prazo mínimo de 20 anos desde o último registro e exige que a destinação final seja registrada. A aplicação deste prazo ao registro vacinal e a tabela de temporalidade do órgão controlador devem ser confirmadas pelo encarregado e pela área responsável por prontuários/arquivos. A LGPD prevê conservação quando necessária para obrigação legal ou regulatória e direitos do titular de solicitar eliminação nos limites legais. Referências: [Lei 13.787/2018, art. 6º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm) e [LGPD, arts. 16 e 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

## Fluxo de atendimento

1. O cidadão autenticado envia uma solicitação pela própria conta. O sistema registra protocolo e data e calcula `manter_dados_ate` a partir da última aplicação.
2. Um funcionário consulta a fila, verifica identidade, finalidade da retenção, prazo, agendamentos pendentes, obrigações legais, processos, auditorias e regras arquivísticas aplicáveis. A justificativa e o responsável pela decisão ficam registrados.
3. Se o prazo ainda não venceu, a solicitação fica como `aguardando_prazo`; pode ser reavaliada depois. Caso haja outro fundamento de retenção, a equipe recusa a eliminação e registra o motivo.
4. Após o prazo e a confirmação de que não há retenção ou agendamento pendente, um funcionário aprova a solicitação.
5. Um funcionário conclui explicitamente a eliminação. A operação revalida prazo e pendências dentro de transação, elimina cadastro, credencial, notificações, agendamentos e histórico vacinal, e registra a conclusão sem manter o vínculo ao cidadão.

Não há expurgo automático. A conta permanece utilizável enquanto a solicitação aguarda análise; a inativação de acesso é uma operação separada. A eliminação final é irreversível e só pode ser iniciada por funcionário em solicitação aprovada. Não inclua dados de saúde ou identificadores no texto da justificativa.

## Auditoria de reativação

Inativação e reativação registram o ID do usuário que executou a ação e o horário. Solicitações, adiamentos por prazo, aprovações, recusas e eliminações também geram evento de auditoria. Na eliminação, eventos antigos são desassociados do paciente para não reconstruir a identidade a partir da trilha do cidadão.

## Migração

Execute `migrations/002_solicitacoes_eliminacao_cidadao.sql` uma vez depois de `001_contas_cidadaos_inativacao.sql`. A migração cria a fila de solicitações, permite desvincular o paciente da auditoria após eliminação e registra os eventos adicionais.

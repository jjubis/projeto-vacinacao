-- Executar uma vez apos 001. Amplia a trilha e registra pedidos de eliminacao.
ALTER TABLE auditoria_status_cidadao
  CHANGE COLUMN funcionario_id ator_usuario_id BIGINT NULL,
  MODIFY COLUMN paciente_id BIGINT NULL,
  MODIFY COLUMN acao ENUM(
    'inativado', 'reativado', 'solicitada_eliminacao',
    'aprovada_eliminacao', 'recusada_eliminacao', 'aguardando_prazo', 'eliminado'
  ) NOT NULL;

CREATE TABLE solicitacoes_eliminacao_cidadao (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  paciente_id BIGINT NULL,
  solicitante_usuario_id BIGINT NULL,
  status ENUM('solicitada', 'aguardando_prazo', 'aprovada', 'recusada', 'concluida') NOT NULL DEFAULT 'solicitada',
  solicitado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  manter_dados_ate DATE NULL,
  decisoes TEXT NULL,
  decisoes_em DATETIME NULL,
  decisoes_por BIGINT NULL,
  concluida_em DATETIME NULL,
  INDEX idx_solicitacoes_eliminacao_status (status, solicitado_em),
  INDEX idx_solicitacoes_eliminacao_paciente (paciente_id, status)
);

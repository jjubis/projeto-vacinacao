-- Execute uma vez no MySQL antes de publicar a versao que implementa inativacao.
-- Todas as contas existentes permanecem ativas pelo valor padrao.
ALTER TABLE usuarios
  ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN inativado_em DATETIME NULL,
  ADD COLUMN inativado_por BIGINT NULL;

CREATE TABLE auditoria_status_cidadao (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  paciente_id BIGINT NOT NULL,
  funcionario_id BIGINT NULL,
  acao ENUM('inativado', 'reativado') NOT NULL,
  ocorrido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_cidadao_data (paciente_id, ocorrido_em)
);

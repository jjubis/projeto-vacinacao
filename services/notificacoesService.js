import { pool } from '../config/database.js';

export async function inicializarNotificacoes() {
  await pool.query(`CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    destinatario_id BIGINT UNSIGNED NOT NULL,
    categoria VARCHAR(40) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    mensagem TEXT NOT NULL,
    chave_unica VARCHAR(190) NULL,
    lida_em DATETIME NULL,
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notificacoes_chave_unica (chave_unica),
    KEY idx_notificacoes_destinatario_leitura (destinatario_id, lida_em, criada_em)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS notificacoes_alertas_estado (
    chave_alerta VARCHAR(190) NOT NULL PRIMARY KEY,
    ativo TINYINT(1) NOT NULL DEFAULT 0,
    versao INT UNSIGNED NOT NULL DEFAULT 0,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export async function notificarUsuario(destinatarioId, categoria, titulo, mensagem, chaveUnica = null) {
  if (!destinatarioId) return;
  await pool.query(
    `INSERT INTO notificacoes (destinatario_id, categoria, titulo, mensagem, chave_unica)
     VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`,
    [destinatarioId, categoria, titulo, mensagem, chaveUnica]
  );
}

export async function notificarCidadao(pacienteId, categoria, titulo, mensagem, chaveUnica) {
  const [usuarios] = await pool.query(
    "SELECT id FROM usuarios WHERE paciente_id = ? AND papel = 'cidadao'", [pacienteId]
  );
  for (const usuario of usuarios) {
    await notificarUsuario(usuario.id, categoria, titulo, mensagem,
      chaveUnica ? `${chaveUnica}:usuario:${usuario.id}` : null);
  }
}

export async function notificarFuncionarios(categoria, titulo, mensagem, chaveUnica) {
  const [usuarios] = await pool.query("SELECT id FROM usuarios WHERE papel = 'funcionario'");
  for (const usuario of usuarios) {
    await notificarUsuario(usuario.id, categoria, titulo, mensagem,
      chaveUnica ? `${chaveUnica}:usuario:${usuario.id}` : null);
  }
}

export async function listarNotificacoes(usuarioId, { naoLidas = false, categoria = null } = {}) {
  const filtros = ['destinatario_id = ?'];
  const parametros = [usuarioId];
  if (naoLidas) filtros.push('lida_em IS NULL');
  if (categoria) { filtros.push('categoria = ?'); parametros.push(categoria); }
  const [rows] = await pool.query(
    `SELECT id, categoria, titulo, mensagem, lida_em, criada_em
     FROM notificacoes WHERE ${filtros.join(' AND ')} ORDER BY criada_em DESC LIMIT 100`, parametros
  );
  return rows;
}

export async function contarNaoLidas(usuarioId) {
  const [[row]] = await pool.query(
    'SELECT COUNT(*) AS total FROM notificacoes WHERE destinatario_id = ? AND lida_em IS NULL', [usuarioId]
  );
  return Number(row.total);
}

export async function marcarComoLida(usuarioId, id = null) {
  if (id === null) {
    const [result] = await pool.query(
      'UPDATE notificacoes SET lida_em = CURRENT_TIMESTAMP WHERE destinatario_id = ? AND lida_em IS NULL', [usuarioId]
    );
    return result.affectedRows;
  }
  const [result] = await pool.query(
    'UPDATE notificacoes SET lida_em = CURRENT_TIMESTAMP WHERE id = ? AND destinatario_id = ? AND lida_em IS NULL',
    [id, usuarioId]
  );
  return result.affectedRows;
}

export async function verificarAlertasDeVacinas() {
  const [vacinas] = await pool.query(
    "SELECT id, nome, quantidade_estoque, minimo_alerta, DATE_FORMAT(validade, '%Y-%m-%d') AS validade, lote FROM vacinas"
  );
  for (const vacina of vacinas) {
    const quantidade = Number(vacina.quantidade_estoque);
    const minimo = Number(vacina.minimo_alerta || 0);
    for (const faixa of ['baixo', 'critico']) {
      const chave = `estoque:${vacina.id}:${faixa}`;
      const ativo = Number.isFinite(quantidade) && (faixa === 'critico'
        ? quantidade <= 0 : quantidade > 0 && quantidade <= minimo);
      await atualizarEstadoAlerta(chave, ativo, async versao => {
        await notificarFuncionarios('estoque', `Estoque ${faixa === 'critico' ? 'crítico' : 'baixo'}`,
          `${vacina.nome} está com ${quantidade} dose(s), no limite mínimo configurado (${minimo}).`,
          `${chave}:v${versao}`);
      });
    }

    const prefixoValidade = `validade:${vacina.id}:`;
    if (vacina.validade) {
      const validade = new Date(`${String(vacina.validade).slice(0, 10)}T23:59:59`);
      const dias = Math.ceil((validade.getTime() - Date.now()) / 86400000);
      const lote = vacina.lote || `vacina-${vacina.id}`;
      const dataValidade = String(vacina.validade).slice(0, 10);
      const chave = `${prefixoValidade}${lote}:${dataValidade}`;
      await desativarAlertasRelacionados(prefixoValidade, chave);
      if (!Number.isNaN(dias) && dias <= 30) {
        const expirada = dias < 0;
        await atualizarEstadoAlerta(chave, true, async versao => {
          await notificarFuncionarios('validade', expirada ? 'Lote vencido' : 'Lote próximo do vencimento',
            `${vacina.nome} (lote ${lote}) ${expirada ? 'está vencida' : `vence em ${Math.max(dias, 0)} dia(s)`}.`,
            `${chave}:v${versao}`);
        });
      } else await atualizarEstadoAlerta(chave, false);
    } else {
      await desativarAlertasRelacionados(prefixoValidade);
    }
  }
}

async function atualizarEstadoAlerta(chave, ativo, aoAtivar) {
  if (!ativo) {
    await pool.query('UPDATE notificacoes_alertas_estado SET ativo = 0 WHERE chave_alerta = ? AND ativo = 1', [chave]);
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO notificacoes_alertas_estado (chave_alerta, ativo, versao) VALUES (?, 1, 1)
     ON DUPLICATE KEY UPDATE versao = IF(ativo = 0, versao + 1, versao), ativo = 1`, [chave]
  );
  if (!result.affectedRows) return;
  const [[estado]] = await pool.query('SELECT versao FROM notificacoes_alertas_estado WHERE chave_alerta = ?', [chave]);
  try { await aoAtivar(estado.versao); }
  catch (error) {
    await pool.query('UPDATE notificacoes_alertas_estado SET ativo = 0 WHERE chave_alerta = ?', [chave]);
    throw error;
  }
}

async function desativarAlertasRelacionados(prefixo, exceto = null) {
  if (exceto) {
    await pool.query(
      'UPDATE notificacoes_alertas_estado SET ativo = 0 WHERE chave_alerta LIKE CONCAT(?, \'%\') AND chave_alerta <> ? AND ativo = 1',
      [prefixo, exceto]
    );
  } else {
    await pool.query(
      'UPDATE notificacoes_alertas_estado SET ativo = 0 WHERE chave_alerta LIKE CONCAT(?, \'%\') AND ativo = 1',
      [prefixo]
    );
  }
}

export default { inicializarNotificacoes, notificarUsuario, notificarCidadao, notificarFuncionarios,
  listarNotificacoes, contarNaoLidas, marcarComoLida, verificarAlertasDeVacinas };

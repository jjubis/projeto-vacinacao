import notificacoesService from '../services/notificacoesService.js';

const listar = async (req, res, next) => {
  try {
    const categoria = req.usuario.papel === 'funcionario' ? req.query.categoria || null : null;
    const naoLidas = req.query.naoLidas === 'true';
    res.json({ success: true, data: await notificacoesService.listarNotificacoes(req.usuario.id, { naoLidas, categoria }) });
  } catch (error) { next(error); }
};

const contador = async (req, res, next) => {
  try { res.json({ success: true, total: await notificacoesService.contarNaoLidas(req.usuario.id) }); }
  catch (error) { next(error); }
};

const marcarLida = async (req, res, next) => {
  try {
    const quantidade = await notificacoesService.marcarComoLida(req.usuario.id, req.params.id);
    if (!quantidade) return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });
    res.json({ success: true });
  } catch (error) { next(error); }
};

const marcarTodas = async (req, res, next) => {
  try {
    const quantidade = await notificacoesService.marcarComoLida(req.usuario.id);
    res.json({ success: true, quantidade });
  } catch (error) { next(error); }
};

export default { listar, contador, marcarLida, marcarTodas };

// Middleware global de tratamento de erros.
// Deve ser registrado por último, depois de todas as rotas em app.js.
// Qualquer erro passado via next(error) cai aqui.
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Erros "conhecidos" podem definir err.statusCode para customizar a resposta.
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    message
  });
};

export default errorHandler;

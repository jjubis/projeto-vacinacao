import dotenv from 'dotenv'
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';
import { inicializarNotificacoes, verificarAlertasDeVacinas } from './services/notificacoesService.js';

const PORT = Number(process.env.PORT || 4000);

const startServer = async () => {
    await testConnection();
    await inicializarNotificacoes();
    try { await verificarAlertasDeVacinas(); }
    catch (error) { console.error('Não foi possível verificar alertas de vacinas:', error.message); }
    setInterval(() => {
        verificarAlertasDeVacinas().catch(error => console.error('Falha na verificação periódica de vacinas:', error.message));
    }, 24 * 60 * 60 * 1000).unref();

    app.listen(PORT, () => {
        console.log(`Servidor iniciado na porta ${PORT}`);
    });
};

startServer();

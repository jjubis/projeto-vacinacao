import dotenv from 'dotenv'
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';

const PORT = Number(process.env.PORT || 4000);

const startServer = async () => {
    await testConnection();

    app.listen(PORT, () => {
        console.log(`Servidor iniciado na porta ${PORT}`);
    });
};

startServer();

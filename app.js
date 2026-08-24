import express from 'express'
import cors from 'cors'

import authRoutes from './routes/authRoutes.js'
import pacientesRoutes from './routes/pacientesRoutes.js';
import vacinasRoutes from './routes/vacinasRoutes.js';
import postosSaudeRoutes from './routes/postosSaudeRoutes.js';
import agendamentosRoutes from './routes/agendamentoRoutes.js';
import historicoRoutes from './routes/historicoRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(cors({
    origin: [
        'http://localhost:5173', // Altere para a porta que seu front local usa (3000, 5173, etc.)
        'https://imuniza-mais-web.vercel.app' // Coloque aqui a URL do seu front quando fizer o deploy dele
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/pacientes', pacientesRoutes);
app.use('/vacinas', vacinasRoutes);
app.use('/postos', postosSaudeRoutes);
app.use('/agendamentos', agendamentosRoutes);
app.use('/historico', historicoRoutes);

app.use(errorHandler);

export default app;
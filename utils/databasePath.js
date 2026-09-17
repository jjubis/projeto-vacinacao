import 'dotenv/config';
import path from 'node:path';

// Um único ponto de configuração para desenvolvimento, testes e entrega.
// Por padrão, mantém compatibilidade com o banco local existente.
export const DATABASE_PATH = path.resolve(process.env.DATABASE_PATH || 'vacinacao.db');

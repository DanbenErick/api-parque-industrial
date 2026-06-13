import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';
import errorHandler from './middlewares/errorHandler';

// Validación temprana de variables de entorno
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`FATAL ERROR: La variable de entorno ${envVar} no está definida.`);
    process.exit(1);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean) as string[];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir si no hay origen (ej. curl o postman) o si está en la lista o si es de localhost
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS'));
    }
  },
  optionsSuccessStatus: 200
};

// ── Seguridad HTTP (Helmet) ──────────────────────────────────────────────────
app.use(helmet());

// ── Rate Limiting ────────────────────────────────────────────────────────────
// Global: máximo 300 req/min por IP para proteger todos los endpoints
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minuto
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intente nuevamente en un minuto.' }
});
app.use(globalLimiter);

// Login: más estricto — máximo 20 intentos cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.' },
  skipSuccessfulRequests: true // Solo cuenta intentos fallidos
});
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    msg: 'Funcionando'
  });
});

// Import and use routes
import authRoutes from './routes/authRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import periodoRoutes from './routes/periodoRoutes';
import medidorRoutes from './routes/medidorRoutes';
import lecturaRoutes from './routes/lecturaRoutes';
import reciboRoutes from './routes/reciboRoutes';
import pagoRoutes from './routes/pagoRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import configRoutes from './routes/configRoutes';
import catalogoCargoRoutes from './routes/catalogoCargoRoutes';

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/periodos', periodoRoutes);
app.use('/api/medidores', medidorRoutes);
app.use('/api/lecturas', lecturaRoutes);
app.use('/api/recibos', reciboRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/catalogo-cargos', catalogoCargoRoutes);

// Error handling middleware (Centralizado)
app.use(errorHandler);

// Import and initialize cron jobs
import initRecibosCron from './cron/recibosCron';
initRecibosCron();

app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

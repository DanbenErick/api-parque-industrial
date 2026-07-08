import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

// Utils & Config
import { Logger } from './utils/logger';
import { Database } from './config/db';

const logger = new Logger();

// Validación temprana de variables de entorno
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`FATAL ERROR: La variable de entorno ${envVar} no está definida.`);
    process.exit(1);
  }
});

const db = new Database(logger);

// Repositories
import { AuditoriaRepository } from './repositories/auditoriaRepository';
import { AuthRepository } from './repositories/authRepository';
import { CatalogoCargoRepository } from './repositories/catalogoCargoRepository';
import { ConfigRepository } from './repositories/configRepository';
import { LecturaRepository } from './repositories/lecturaRepository';
import { MedidorRepository } from './repositories/medidorRepository';
import { PagoRepository } from './repositories/pagoRepository';
import { PeriodoRepository } from './repositories/periodoRepository';
import { ReciboRepository } from './repositories/reciboRepository';
import { UsuarioRepository } from './repositories/usuarioRepository';

const auditoriaRepo = new AuditoriaRepository(db);
const authRepo = new AuthRepository(db);
const catalogoCargoRepo = new CatalogoCargoRepository(db);
const configRepo = new ConfigRepository(db);
const lecturaRepo = new LecturaRepository(db);
const medidorRepo = new MedidorRepository(db);
const pagoRepo = new PagoRepository(db);
const periodoRepo = new PeriodoRepository(db);
const reciboRepo = new ReciboRepository(db);
const usuarioRepo = new UsuarioRepository(db);

// Services
import { PdfService } from './services/pdfService';
import { ExcelService } from './services/excelService';
import { ReciboService } from './services/reciboService';

const pdfService = new PdfService(reciboRepo, auditoriaRepo, pagoRepo, usuarioRepo, db);
const excelService = new ExcelService(reciboRepo, auditoriaRepo, pagoRepo, usuarioRepo);
const reciboService = new ReciboService(db);

import { ImportBulkService } from './services/importBulkService';
const importBulkService = new ImportBulkService(db);

// Middlewares
import { AuthMiddleware } from './middlewares/auth';
import { ErrorHandlerMiddleware } from './middlewares/errorHandler';
import { ValidatorsMiddleware } from './middlewares/validators';

const authMiddleware = new AuthMiddleware();
const errorHandlerMiddleware = new ErrorHandlerMiddleware(logger);
const validatorsMiddleware = new ValidatorsMiddleware();

// Controllers
import { AuthController } from './controllers/authController';
import { CatalogoCargoController } from './controllers/catalogoCargoController';
import { ConfigController } from './controllers/configController';
import { DashboardController } from './controllers/dashboardController';
import { LecturaController } from './controllers/lecturaController';
import { MedidorController } from './controllers/medidorController';
import { PagoController } from './controllers/pagoController';
import { PeriodoController } from './controllers/periodoController';
import { ReciboController } from './controllers/reciboController';
import { UsuarioController } from './controllers/usuarioController';

const authController = new AuthController(authRepo);
const catalogoCargoController = new CatalogoCargoController(catalogoCargoRepo);
const configController = new ConfigController(configRepo);
const dashboardController = new DashboardController(db);
const lecturaController = new LecturaController(lecturaRepo, db);
const medidorController = new MedidorController(medidorRepo);
const pagoController = new PagoController(pdfService, excelService, pagoRepo);
const periodoController = new PeriodoController(periodoRepo);
const reciboController = new ReciboController(pdfService, excelService, auditoriaRepo, reciboRepo, reciboService, pagoRepo);
const usuarioController = new UsuarioController(pdfService, excelService, usuarioRepo, medidorRepo);

// Routes
import { AuthRoutes } from './routes/authRoutes';
import { CatalogoCargoRoutes } from './routes/catalogoCargoRoutes';
import { ConfigRoutes } from './routes/configRoutes';
import { DashboardRoutes } from './routes/dashboardRoutes';
import { LecturaRoutes } from './routes/lecturaRoutes';
import { MedidorRoutes } from './routes/medidorRoutes';
import { PagoRoutes } from './routes/pagoRoutes';
import { PeriodoRoutes } from './routes/periodoRoutes';
import { ReciboRoutes } from './routes/reciboRoutes';
import { UsuarioRoutes } from './routes/usuarioRoutes';

const authRoutes = new AuthRoutes(authController, authMiddleware, validatorsMiddleware).getRouter();
const catalogoCargoRoutes = new CatalogoCargoRoutes(catalogoCargoController, authMiddleware).getRouter();
const configRoutes = new ConfigRoutes(configController, authMiddleware).getRouter();
const dashboardRoutes = new DashboardRoutes(dashboardController, authMiddleware).getRouter();
const lecturaRoutes = new LecturaRoutes(lecturaController, authMiddleware).getRouter();
const medidorRoutes = new MedidorRoutes(medidorController, authMiddleware).getRouter();
const pagoRoutes = new PagoRoutes(pagoController, authMiddleware).getRouter();
const periodoRoutes = new PeriodoRoutes(periodoController, authMiddleware).getRouter();
const reciboRoutes = new ReciboRoutes(reciboController, authMiddleware).getRouter();
const usuarioRoutes = new UsuarioRoutes(usuarioController, authMiddleware, validatorsMiddleware).getRouter();

import { ImportRoutes } from './routes/importRoutes';
const importRoutes = new ImportRoutes(importBulkService, authMiddleware).getRouter();

// Cron
import { RecibosCron } from './cron/recibosCron';
const recibosCron = new RecibosCron(db, logger);
recibosCron.init();

// Express setup
const app = express();
const PORT = process.env.PORT || 5000;

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intente nuevamente en un minuto.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.' },
  skipSuccessfulRequests: true
});

app.use(helmet());
app.use(globalLimiter);
app.use(cors({origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Custom middleware para loggear params, body y responses - Removido por ser muy verboso

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ ok: true, msg: 'Funcionando con Arquitectura POO y DI' });
});

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
app.use('/api/importar', importRoutes);

// Error handler
app.use(errorHandlerMiddleware.handle);

app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

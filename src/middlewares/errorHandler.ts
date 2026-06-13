import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  if (err.isOperational) {
    logger.warn(`Operational Error: ${err.message}`);
  } else {
    logger.error(`Unhandled Error: ${err.stack}`);
  }

  // Handle specific database errors
  if (err.code === 'ER_DUP_ENTRY') {
    err = new AppError('Ya existe un registro con esos datos únicos.', 400);
  }

  // Enviar respuesta
  res.status(err.statusCode).json({
    status: err.status,
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

export default errorHandler;

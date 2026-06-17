import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`
      )
    );

    this.logger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({ 
          filename: path.join(__dirname, '../../logs/error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(__dirname, '../../logs/combined.log') 
        })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }));
    }
  }

  public info(msg: string) { this.logger.info(msg); }
  public error(msg: string) { this.logger.error(msg); }
  public warn(msg: string) { this.logger.warn(msg); }
}

import cron from 'node-cron';
import db from '../config/db';
import logger from '../utils/logger';

const initRecibosCron = () => {
  // Ejecutar todos los días a la medianoche (00:01)
  cron.schedule('1 0 * * *', async () => {
    try {
      logger.info('🔄 Ejecutando cron job: Verificando recibos vencidos...');
      
      const [result]: any = await db.query(`
        UPDATE recibo 
        SET estado = 'Vencido' 
        WHERE estado = 'Pendiente' 
          AND fecha_vencimiento < CURDATE() 
          AND deleted_at IS NULL
      `);
      
      logger.info(`✅ Cron job finalizado. Recibos marcados como vencidos: ${result.affectedRows}`);
    } catch (error: any) {
      logger.error(`❌ Error en el cron job de recibos: ${error.message}`);
    }
  });

  logger.info('⏱️  Cron job de recibos inicializado (se ejecutará a las 00:01 todos los días).');
};

export default initRecibosCron;

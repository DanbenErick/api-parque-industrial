import cron from 'node-cron';
import { Database } from '../config/db';
import { Logger } from '../utils/logger';
import { EstadoRecibo } from '../types/enums';


export class RecibosCron {
  constructor(private db: Database, private logger: Logger) {}

  public init() {
    // Ejecutar todos los días a la medianoche (00:01)
    cron.schedule('1 0 * * *', async () => {
      try {
        this.logger.info('🔄 Ejecutando cron job: Verificando recibos vencidos...');
        
        const [result]: any = await this.db.query(`
          UPDATE recibo 
          SET estado = '${EstadoRecibo.VENCIDO}' 
          WHERE estado = '${EstadoRecibo.PENDIENTE}' 
            AND fecha_vencimiento < CURDATE() 
            AND deleted_at IS NULL
        `);
        
        this.logger.info(`✅ Cron job finalizado. Recibos marcados como vencidos: ${result.affectedRows}`);
      } catch (error: any) {
        this.logger.error(`❌ Error en el cron job de recibos: ${error.message}`);
      }
    });

    this.logger.info('⏱️  Cron job de recibos inicializado (se ejecutará a las 00:01 todos los días).');
  }
}

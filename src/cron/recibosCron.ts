import cron from 'node-cron';
import { Database } from '../config/db';
import { Logger } from '../utils/logger';
import { EstadoRecibo } from '../types/enums';


export class RecibosCron {
  constructor(private db: Database, private logger: Logger) {}

  public init() {
    // Ejecutar todos los días a la medianoche (00:01)
    cron.schedule('1 0 * * *', async () => {
      let connection;
      try {
        this.logger.info('🔄 Ejecutando cron job: Verificando recibos vencidos...');
        
        // Obtenemos una conexión específica para asegurar que la variable de sesión
        // aplique al mismo contexto donde se ejecuta el UPDATE
        connection = await this.db.getConnection();
        
        // Seteamos el usuario administrador (ID 29) por defecto o "Sistema" para el trigger
        await connection.query('SET @current_user_id = 29');
        
        const [result]: any = await connection.query(`
          UPDATE recibo 
          SET estado = '${EstadoRecibo.VENCIDO}' 
          WHERE estado = '${EstadoRecibo.PENDIENTE}' 
            AND fecha_vencimiento < CURDATE() 
            AND deleted_at IS NULL
        `);
        
        this.logger.info(`✅ Cron job finalizado. Recibos marcados como vencidos: ${result.affectedRows}`);
      } catch (error: any) {
        this.logger.error(`❌ Error en el cron job de recibos: ${error.message}`);
      } finally {
        if (connection) {
          connection.release();
        }
      }
    });

    this.logger.info('⏱️  Cron job de recibos inicializado (se ejecutará a las 00:01 todos los días).');
  }
}

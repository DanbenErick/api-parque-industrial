const cron = require('node-cron');
const db = require('../config/db');

const initRecibosCron = () => {
  // Ejecutar todos los días a la medianoche (00:01)
  cron.schedule('1 0 * * *', async () => {
    try {
      console.log('🔄 Ejecutando cron job: Verificando recibos vencidos...');
      
      const [result] = await db.query(`
        UPDATE recibo 
        SET estado = 'Vencido' 
        WHERE estado = 'Pendiente' 
          AND fecha_vencimiento < CURDATE() 
          AND deleted_at IS NULL
      `);
      
      console.log(`✅ Cron job finalizado. Recibos marcados como vencidos: ${result.affectedRows}`);
    } catch (error) {
      console.error('❌ Error en el cron job de recibos:', error);
    }
  });

  console.log('⏱️  Cron job de recibos inicializado (se ejecutará a las 00:01 todos los días).');
};

module.exports = initRecibosCron;

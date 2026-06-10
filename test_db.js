const db = require('./src/config/db');
async function run() {
  const [rows] = await db.query(`
    SELECT r.id, r.periodo_id, r.total, r.estado, r.numero_comprobante, r.deuda_vencida, u.nombre_razonsocial 
    FROM recibo r 
    INNER JOIN usuario u ON r.usuario_id = u.id 
    WHERE u.nombre_razonsocial LIKE '%Textil%'
  `);
  console.log(rows);
  const [pagos] = await db.query('SELECT * FROM pago');
  console.log(pagos);
  process.exit(0);
}
run();

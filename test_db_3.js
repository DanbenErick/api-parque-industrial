const db = require('./src/config/db');
async function run() {
  const [periodos] = await db.query('SELECT id, mes_anio FROM periodo_facturacion');
  console.log("Periodos:", periodos);
  const [recibos] = await db.query(`
    SELECT r.id, r.periodo_id, r.total, r.estado, u.nombre_razonsocial 
    FROM recibo r 
    INNER JOIN usuario u ON r.usuario_id = u.id 
    WHERE u.nombre_razonsocial LIKE '%Textil Sur%'
  `);
  console.log("Recibos:", recibos);
  process.exit(0);
}
run();

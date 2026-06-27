const db = require('./src/config/db').default;
async function check() {
  const [rows] = await db.query('SELECT id, mes_anio, fecha_emision_recibo, fecha_vencimiento, fecha_corte FROM periodo_facturacion;');
  console.log(rows);
  process.exit(0);
}
check();

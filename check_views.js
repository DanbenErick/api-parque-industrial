const db = require('./src/config/db');
async function check() {
  const [rows] = await db.query('DESCRIBE v_recibos_pendientes');
  console.log("v_recibos_pendientes:", rows);
  const [rows2] = await db.query('DESCRIBE recibo');
  console.log("recibo:", rows2);
  process.exit(0);
}
check();

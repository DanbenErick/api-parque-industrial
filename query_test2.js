const db = require('./src/config/db');
async function test() {
  const [rows] = await db.query('SELECT id, numero_comprobante, periodo_id, usuario_id FROM recibo;');
  console.log("Recibos:", rows);
  process.exit(0);
}
test();

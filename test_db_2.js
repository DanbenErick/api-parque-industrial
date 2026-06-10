const db = require('./src/config/db');
async function run() {
  const [r] = await db.query('SELECT created_at FROM recibo WHERE id = 13');
  const [p] = await db.query('SELECT created_at FROM pago WHERE id = 7');
  console.log("Recibo 13 created_at:", r[0].created_at);
  console.log("Pago 7 created_at:", p[0].created_at);
  process.exit(0);
}
run();

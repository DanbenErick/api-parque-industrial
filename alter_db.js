const db = require('./src/config/db');
async function run() {
  try {
    await db.query('ALTER TABLE recibo ADD COLUMN multa_reconexion DECIMAL(12,2) DEFAULT 0.00 AFTER multa_manipulacion');
    console.log("Columna añadida a recibo");
  } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();

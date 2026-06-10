const db = require('./src/config/db');
async function run() {
  try {
    await db.query('ALTER TABLE usuario ADD COLUMN saldo_a_favor DECIMAL(12,2) DEFAULT 0.00 AFTER es_activo');
    console.log("Columna saldo_a_favor añadida a usuario");
  } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();

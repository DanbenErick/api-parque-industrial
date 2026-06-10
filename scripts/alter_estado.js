const db = require('../src/config/db');

async function run() {
  try {
    await db.query("ALTER TABLE recibo MODIFY COLUMN estado VARCHAR(50) DEFAULT 'Pendiente'");
    console.log("Table recibo altered successfully to support 'Pago Parcial'");
  } catch (err) {
    console.error("Error or already altered:", err.message);
  } finally {
    process.exit();
  }
}
run();

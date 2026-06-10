const db = require('./src/config/db');
async function check() {
  const [rows] = await db.query('DESCRIBE recibo');
  console.log("recibo:", rows);
  process.exit(0);
}
check();

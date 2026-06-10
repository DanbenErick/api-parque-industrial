const db = require('../src/config/db');

async function check() {
  const [rows] = await db.query('SELECT id, periodo_id FROM lectura WHERE periodo_id IN (3, 4, 8, 9)');
  console.log(rows);
  process.exit(0);
}
check();

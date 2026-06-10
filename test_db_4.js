const db = require('./src/config/db');
async function run() {
  const [columns] = await db.query('DESCRIBE recibo');
  console.log(columns);
  process.exit(0);
}
run();

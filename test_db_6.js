const db = require('./src/config/db');
async function run() {
  const [columns] = await db.query('DESCRIBE usuario');
  console.log(columns);
  process.exit(0);
}
run();

const db = require('./src/config/db');
async function check() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();

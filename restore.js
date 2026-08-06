const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to DB');

    // Remove the bad medidores created today for user 5
    const [delResult] = await db.query(`DELETE FROM medidor WHERE usuario_id = 5 AND created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)`);
    console.log('Deleted bad medidores:', delResult.affectedRows);

    // Restore the good medidores
    const [resResult] = await db.query(`UPDATE medidor SET deleted_at = NULL, operativo = 1 WHERE usuario_id = 5 AND deleted_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)`);
    console.log('Restored good medidores:', resResult.affectedRows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();

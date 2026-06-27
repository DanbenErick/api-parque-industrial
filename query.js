const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  const [rows] = await db.query('SHOW COLUMNS FROM recibo;');
  console.log(rows.map(r => r.Field).join(', '));

  await db.end();
}
main().catch(console.error);

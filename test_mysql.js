const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  await connection.query('DELETE FROM recibo WHERE id IN (4, 5, 6);');
  console.log("Deleted");
  await connection.end();
}
run();

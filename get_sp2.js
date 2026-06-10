const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'luz',
      port: process.env.DB_PORT || 3306
    });
    
    const [rows] = await connection.query("SELECT ROUTINE_NAME, ROUTINE_DEFINITION FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = 'luz';");
    console.table(rows);
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
check();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'parque',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'parque_industrial_jicamarca',
      port: process.env.DB_PORT || 3306
    });
    
    const [rows] = await connection.query("SHOW CREATE PROCEDURE sp_generar_recibos;");
    console.log(rows[0]['Create Procedure']);
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
check();

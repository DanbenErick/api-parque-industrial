const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.query("SELECT DISTINCT tipo FROM medidor;");
    console.log(rows);
    
    // Also, just change to VARCHAR to avoid these enum issues.
    console.log('Changing column to VARCHAR(50)...');
    await connection.query("ALTER TABLE medidor MODIFY COLUMN tipo VARCHAR(50) DEFAULT 'Normal';");
    const [res] = await connection.query("UPDATE medidor SET tipo = 'Hora Punta' WHERE tipo = 'Tiempo Real';");
    console.log(`Updated ${res.affectedRows} rows in medidor`);
    
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

run();

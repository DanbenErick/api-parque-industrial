const mysql = require('mysql2/promise');

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'parque',
      password: 'parque_industrial_jicamarca',
      database: 'parque_industrial_jicamarca'
    });
    const [rows] = await connection.query(`SHOW COLUMNS FROM periodo_facturacion`);
    console.log(rows);
    await connection.end();
  } catch (error) {
    console.error("Error:", error);
  }
}
main();

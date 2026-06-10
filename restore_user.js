require('dotenv').config();
const mysql = require('mysql2/promise');

async function restoreUsers() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [result] = await pool.query('UPDATE usuario SET deleted_at = NULL, es_activo = FALSE WHERE deleted_at IS NOT NULL');
    console.log(`Restaurados ${result.affectedRows} usuarios.`);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

restoreUsers();

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'parque',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parque_industrial_jicamarca',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Probar conexión inicial
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL establecida correctamente');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar con MySQL:', err.message);
  });

module.exports = pool;

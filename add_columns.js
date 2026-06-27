const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'parque',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parque_industrial_jicamarca'
  });

  try {
    console.log('Adding lectura_actual_original columns...');
    await connection.query(`
      ALTER TABLE lectura 
      ADD COLUMN lectura_actual_original DECIMAL(12,2) DEFAULT NULL COMMENT 'Valor antes de modificación',
      ADD COLUMN lectura_actual_punta_original DECIMAL(12,2) DEFAULT NULL COMMENT 'Valor antes de modificación',
      ADD COLUMN factor_potencia_original DECIMAL(12,2) DEFAULT NULL COMMENT 'Valor antes de modificación'
    `);
    console.log('Columns added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Error adding columns:', err);
    }
  } finally {
    await connection.end();
  }
}

addColumns();

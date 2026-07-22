const mysql = require('mysql2/promise');

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'parque',
      password: 'parque_industrial_jicamarca',
      database: 'parque_industrial_jicamarca'
    });

    console.log("Conectado a la BD.");
    
    // Check if columns exist first to avoid errors
    const [columns] = await connection.query(`SHOW COLUMNS FROM medidor LIKE 'lectura_inicial'`);
    if (columns.length === 0) {
        await connection.query(`ALTER TABLE medidor ADD COLUMN lectura_inicial DECIMAL(12,2) DEFAULT '0.00' COMMENT 'Lectura base al registrar el medidor'`);
        console.log("Columna lectura_inicial agregada.");
    } else {
        console.log("Columna lectura_inicial ya existe.");
    }

    const [columnsPunta] = await connection.query(`SHOW COLUMNS FROM medidor LIKE 'lectura_inicial_punta'`);
    if (columnsPunta.length === 0) {
        await connection.query(`ALTER TABLE medidor ADD COLUMN lectura_inicial_punta DECIMAL(12,2) DEFAULT '0.00' COMMENT 'Lectura base punta al registrar el medidor'`);
        console.log("Columna lectura_inicial_punta agregada.");
    } else {
        console.log("Columna lectura_inicial_punta ya existe.");
    }

    await connection.end();
    console.log("Script completado.");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();

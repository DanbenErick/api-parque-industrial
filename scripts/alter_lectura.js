const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'parque',
    password: 'parque_industrial_jicamarca',
    database: 'parque_industrial_jicamarca'
  });

  try {
    await connection.query("ALTER TABLE lectura ADD COLUMN precio_factor_potencia DECIMAL(10,4) DEFAULT 0.00 COMMENT 'Precio por unidad de energia reactiva' AFTER factor_potencia;");
    console.log("Columna precio_factor_potencia agregada correctamente.");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("La columna ya existe.");
    } else {
      console.error(error);
    }
  } finally {
    await connection.end();
  }
}

run();

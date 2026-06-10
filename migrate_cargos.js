const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parque_industrial_jicamarca',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log("Creando tabla catalogo_cargo...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`catalogo_cargo\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`tipo\` VARCHAR(20) NOT NULL COMMENT 'Costo o Multa',
        \`descripcion\` VARCHAR(150) NOT NULL,
        \`monto_defecto\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`es_activo\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Creando tabla catalogo_cargo_periodo...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`catalogo_cargo_periodo\` (
        \`catalogo_cargo_id\` INT NOT NULL,
        \`periodo_facturacion_id\` INT NOT NULL,
        PRIMARY KEY (\`catalogo_cargo_id\`, \`periodo_facturacion_id\`),
        CONSTRAINT \`fk_ccp_cargo\` FOREIGN KEY (\`catalogo_cargo_id\`) REFERENCES \`catalogo_cargo\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_ccp_periodo\` FOREIGN KEY (\`periodo_facturacion_id\`) REFERENCES \`periodo_facturacion\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Creando tabla recibo_cargo_dinamico...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`recibo_cargo_dinamico\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`recibo_id\` INT NOT NULL,
        \`descripcion\` VARCHAR(150) NOT NULL,
        \`tipo\` VARCHAR(20) NOT NULL,
        \`monto\` DECIMAL(12,2) NOT NULL,
        \`fecha_aplicacion\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_rcd_recibo\` FOREIGN KEY (\`recibo_id\`) REFERENCES \`recibo\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Migración completada exitosamente.");
  } catch (error) {
    console.error("Error en migración:", error);
  } finally {
    await db.end();
  }
}

migrate();

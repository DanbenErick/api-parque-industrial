import { Database } from './src/config/db';
import { Logger } from './src/utils/logger';

async function migrate() {
  const logger = new Logger();
  const db = new Database(logger);
  const connection = await db.getConnection();

  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`cargo_personalizado\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`usuario_id\` int NOT NULL,
        \`periodo_id\` int NOT NULL,
        \`descripcion\` varchar(255) NOT NULL,
        \`monto\` decimal(10,2) NOT NULL,
        \`estado\` varchar(50) DEFAULT 'Pendiente',
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        \`deleted_at\` timestamp NULL DEFAULT NULL,
        \`created_by\` int DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`fk_cargo_personalizado_usuario\` (\`usuario_id\`),
        KEY \`fk_cargo_personalizado_periodo\` (\`periodo_id\`),
        CONSTRAINT \`fk_cargo_personalizado_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\` (\`id\`),
        CONSTRAINT \`fk_cargo_personalizado_periodo\` FOREIGN KEY (\`periodo_id\`) REFERENCES \`periodo_facturacion\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.query(createTableQuery);
    console.log("Tabla cargo_personalizado creada o ya existente.");
  } catch (error) {
    console.error("Error al crear tabla:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();

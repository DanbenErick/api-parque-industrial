const db = require('./src/config/db');

async function migrate() {
  const connection = await db.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria_descargas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo_documento VARCHAR(255) NOT NULL,
        referencia_id INT NULL,
        fecha_descarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        detalles TEXT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Tabla auditoria_descargas creada con éxito.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();

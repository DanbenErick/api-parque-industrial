const db = require('./src/config/db');
async function run() {
  const [usuarios] = await db.query(`
    SELECT u.id, u.nombre_razonsocial, m.id as medidor_id
    FROM usuario u
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    WHERE u.rol_id = 3 AND u.es_activo = TRUE AND u.deleted_at IS NULL
  `);
  console.log("Usuarios y medidores:", usuarios);
  process.exit(0);
}
run();

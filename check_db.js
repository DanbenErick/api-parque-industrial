const db = require('./src/config/db');

async function checkMedidores() {
  const [usuarios] = await db.query(`
    SELECT u.id, u.nombre_razonsocial, m.num_serie as num_serie_medidor
    FROM usuario u
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
  `);
  console.log('Usuarios y sus medidores:', usuarios);
  process.exit();
}

checkMedidores();

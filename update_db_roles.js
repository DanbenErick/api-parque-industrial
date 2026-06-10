const pool = require('./src/config/db');

async function updateRoles() {
  try {
    const [result] = await pool.query(`UPDATE rol SET nombre_rol = 'Socio' WHERE nombre_rol = 'Miembro'`);
    console.log('Roles actualizados en la base de datos:', result.affectedRows);
  } catch (err) {
    console.error('Error al actualizar roles:', err);
  } finally {
    pool.end();
  }
}

updateRoles();

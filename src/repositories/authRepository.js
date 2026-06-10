const db = require('../config/db');

const findUsuarioByDocumento = async (documento_identidad) => {
  const [rows] = await db.query(
    `SELECT u.*, r.nombre_rol, r.permisos_json, r.rutas_json 
     FROM usuario u
     INNER JOIN rol r ON u.rol_id = r.id
     WHERE u.documento_identidad = ? AND u.deleted_at IS NULL`,
    [documento_identidad]
  );
  return rows.length > 0 ? rows[0] : null;
};

const updateUltimoAcceso = async (id) => {
  await db.query(
    'UPDATE usuario SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
};

const getProfileById = async (id) => {
  const [rows] = await db.query(
    `SELECT u.id, u.documento_identidad, u.nombre_razonsocial, u.cargo_representante, 
            u.telefono, u.correo, u.direccion, u.ultimo_acceso, 
            r.nombre_rol, r.permisos_json, r.rutas_json 
     FROM usuario u
     INNER JOIN rol r ON u.rol_id = r.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getPasswordHashById = async (id) => {
  const [rows] = await db.query(
    'SELECT clave_acceso FROM usuario WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows.length > 0 ? rows[0].clave_acceso : null;
};

const updatePassword = async (id, hashedPassword) => {
  const [result] = await db.query(
    'UPDATE usuario SET clave_acceso = ? WHERE id = ? AND deleted_at IS NULL',
    [hashedPassword, id]
  );
  return result.affectedRows;
};

module.exports = {
  findUsuarioByDocumento,
  updateUltimoAcceso,
  getProfileById,
  getPasswordHashById,
  updatePassword
};

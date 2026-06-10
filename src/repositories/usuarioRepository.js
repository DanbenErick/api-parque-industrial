const db = require('../config/db');

const findAll = async (search = '', rol_id = null, estado = null, rubro = null) => {
  let query = `
    SELECT u.id, u.documento_identidad, u.nombre_razonsocial, u.cargo_representante, 
           u.telefono, u.correo, u.direccion, u.es_activo, u.ultimo_acceso, u.actividad_rubro, u.saldo_a_favor,
           r.nombre_rol, r.id as rol_id,
           (
             SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', id, 'num_serie', num_serie, 'tipo', tipo) SEPARATOR ','), ']')
             FROM medidor 
             WHERE usuario_id = u.id AND deleted_at IS NULL
           ) as medidores,
           COALESCE(rp.deuda_total, 0) as deuda_total,
           COALESCE(rp.recibos_pendientes, 0) as recibos_pendientes
    FROM usuario u
    INNER JOIN rol r ON u.rol_id = r.id
    LEFT JOIN (
      SELECT usuario_id, 
        SUM(total) as deuda_total, 
        COUNT(*) as recibos_pendientes
      FROM recibo 
      WHERE estado = 'Pendiente' AND deleted_at IS NULL
      GROUP BY usuario_id
    ) rp ON rp.usuario_id = u.id
    WHERE u.deleted_at IS NULL
  `;
  const params = [];

  if (rol_id) {
    query += ` AND u.rol_id = ?`;
    params.push(rol_id);
  }

  if (estado !== null && estado !== undefined && estado !== '') {
    if (estado === 'activos' || estado === '1' || estado === 1) {
      query += ` AND u.es_activo = 1`;
    } else if (estado === 'suspendidos' || estado === 'inactivos' || estado === '0' || estado === 0) {
      query += ` AND u.es_activo = 0`;
    }
  }

  if (rubro && rubro !== 'Todos' && rubro !== '') {
    query += ` AND u.actividad_rubro = ?`;
    params.push(rubro);
  }

  if (search && search.trim() !== '') {
    query += ` AND (u.nombre_razonsocial LIKE ? OR u.documento_identidad LIKE ?)`;
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ` ORDER BY u.created_at DESC LIMIT 30`;

  const [rows] = await db.query(query, params);
  return rows;
};

const getStats = async (rol_id = null) => {
  let query = `
    SELECT 
      COUNT(*) as total, 
      SUM(CASE WHEN es_activo = 1 THEN 1 ELSE 0 END) as activos, 
      SUM(CASE WHEN es_activo = 0 THEN 1 ELSE 0 END) as inactivos
    FROM usuario 
    WHERE deleted_at IS NULL
  `;
  const params = [];
  
  if (rol_id) {
    query += ` AND rol_id = ?`;
    params.push(rol_id);
  }
  
  const [rows] = await db.query(query, params);
  
  // En caso de que no haya registros, los SUM devuelven NULL, los convertimos a 0
  return {
    total: rows[0].total || 0,
    activos: rows[0].activos || 0,
    inactivos: rows[0].inactivos || 0
  };
};

const create = async (usuario) => {
  const { rol_id, documento_identidad, nombre_razonsocial, clave_acceso, cargo_representante, telefono, correo, direccion, actividad_rubro } = usuario;
  const [result] = await db.query(
    `INSERT INTO usuario (
      rol_id, documento_identidad, nombre_razonsocial, clave_acceso, 
      cargo_representante, telefono, correo, direccion, actividad_rubro
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rol_id, documento_identidad, nombre_razonsocial, clave_acceso, cargo_representante, telefono, correo, direccion || null, actividad_rubro || null]
  );
  return result.insertId;
};

const update = async (id, usuario) => {
  const { rol_id, documento_identidad, nombre_razonsocial, cargo_representante, telefono, correo, direccion, es_activo, actividad_rubro } = usuario;
  const [result] = await db.query(
    `UPDATE usuario 
     SET rol_id = ?, documento_identidad = ?, nombre_razonsocial = ?, 
         cargo_representante = ?, telefono = ?, correo = ?, 
         direccion = ?, es_activo = ?, actividad_rubro = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [rol_id, documento_identidad, nombre_razonsocial, cargo_representante, telefono, correo, direccion || null, es_activo, actividad_rubro || null, id]
  );
  return result.affectedRows;
};

const softDelete = async (id) => {
  const [result] = await db.query(
    'UPDATE usuario SET deleted_at = CURRENT_TIMESTAMP, es_activo = FALSE WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

const findById = async (id) => {
  const [rows] = await db.query(`
    SELECT u.id, u.documento_identidad, u.nombre_razonsocial, u.cargo_representante, 
           u.telefono, u.correo, u.direccion, u.es_activo, u.ultimo_acceso,
           r.nombre_rol, r.id as rol_id,
           (
             SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', id, 'num_serie', num_serie, 'tipo', tipo) SEPARATOR ','), ']')
             FROM medidor 
             WHERE usuario_id = u.id AND deleted_at IS NULL
           ) as medidores
    FROM usuario u
    INNER JOIN rol r ON u.rol_id = r.id
    WHERE u.id = ? AND u.deleted_at IS NULL
  `, [id]);
  return rows[0];
};

module.exports = {
  findAll,
  getStats,
  findById,
  create,
  update,
  softDelete
};

const db = require('../config/db');

const findAll = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  const [rows] = await db.query(`
    SELECT l.id, l.lectura_anterior, l.lectura_actual, l.consumo_calculado, 
           l.lectura_anterior_punta, l.lectura_actual_punta, l.consumo_calculado_punta, l.factor_potencia,
           l.fecha_registro, l.estado,
           m.num_serie, 
           u.nombre_razonsocial as propietario, u.direccion,
           op.nombre_razonsocial as operario,
           pf.mes_anio as periodo
    FROM lectura l
    INNER JOIN medidor m ON l.medidor_id = m.id
    INNER JOIN usuario u ON m.usuario_id = u.id
    INNER JOIN usuario op ON l.operario_id = op.id
    INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    WHERE l.deleted_at IS NULL
    ORDER BY l.fecha_registro DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows;
};

const findByUsuario = async (usuarioId) => {
  const [rows] = await db.query(`
    SELECT l.id, l.lectura_anterior, l.lectura_actual, l.consumo_calculado, 
           l.lectura_anterior_punta, l.lectura_actual_punta, l.consumo_calculado_punta, l.factor_potencia,
           l.fecha_registro, l.estado, m.num_serie, pf.mes_anio as periodo
    FROM lectura l
    INNER JOIN medidor m ON l.medidor_id = m.id
    INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    WHERE m.usuario_id = ? AND l.deleted_at IS NULL
    ORDER BY l.fecha_registro DESC
  `, [usuarioId]);
  return rows;
};

const create = async (lecturaData) => {
  const { 
    medidor_id, operario_id, periodo_id, 
    lectura_anterior, lectura_actual, 
    lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
    estado 
  } = lecturaData;
  const [result] = await db.query(
    `INSERT INTO lectura (
      medidor_id, operario_id, periodo_id, 
      lectura_anterior, lectura_actual, 
      lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
      estado
    ) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      medidor_id, operario_id, periodo_id, 
      lectura_anterior, lectura_actual, 
      lectura_anterior_punta || 0, lectura_actual_punta || 0, factor_potencia || 0, precio_factor_potencia || 0,
      estado || 'Validado'
    ]
  );
  return result.insertId;
};

const update = async (id, lecturaData) => {
  const { 
    lectura_anterior, lectura_actual, 
    lectura_anterior_punta, lectura_actual_punta, factor_potencia,
    estado, justificacion 
  } = lecturaData;
  const [result] = await db.query(
    `UPDATE lectura 
     SET lectura_anterior = ?, lectura_actual = ?, 
         lectura_anterior_punta = ?, lectura_actual_punta = ?, factor_potencia = ?,
         estado = ?, justificacion = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [
      lectura_anterior, lectura_actual, 
      lectura_anterior_punta || 0, lectura_actual_punta || 0, factor_potencia || 0,
      estado, justificacion, id
    ]
  );
  return result.affectedRows;
};

const softDelete = async (id) => {
  const [result] = await db.query(
    'UPDATE lectura SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

const findByMedidorAndPeriodo = async (medidor_id, periodo_id) => {
  const [rows] = await db.query(
    'SELECT id, lectura_anterior, lectura_actual, consumo_calculado, lectura_anterior_punta, lectura_actual_punta, consumo_calculado_punta, factor_potencia, estado FROM lectura WHERE medidor_id = ? AND periodo_id = ? AND deleted_at IS NULL LIMIT 1',
    [medidor_id, periodo_id]
  );
  return rows[0];
};

module.exports = {
  findAll,
  findByUsuario,
  create,
  update,
  softDelete,
  findByMedidorAndPeriodo
};

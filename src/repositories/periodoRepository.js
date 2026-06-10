const db = require('../config/db');

const findAll = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  const [rows] = await db.query('SELECT * FROM periodo_facturacion WHERE deleted_at IS NULL ORDER BY fecha_inicio DESC LIMIT ? OFFSET ?', [limit, offset]);
  return rows;
};

const findByMesAnio = async (mes_anio) => {
  const [rows] = await db.query('SELECT id FROM periodo_facturacion WHERE mes_anio = ? AND deleted_at IS NULL', [mes_anio]);
  return rows[0] || null;
};

const create = async (periodo) => {
  const { mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin } = periodo;
  const [result] = await db.query(
    `INSERT INTO periodo_facturacion (
      mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [mes_anio, factor_multiplicador || 1.0000, tarifa_kwh, tarifa_kwh_punta || 0, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin]
  );
  return result.insertId;
};

const update = async (id, periodo) => {
  const { mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin } = periodo;
  const [result] = await db.query(
    `UPDATE periodo_facturacion 
     SET mes_anio = ?, factor_multiplicador = ?, tarifa_kwh = ?, tarifa_kwh_punta = ?,
         tarifa_mantenimiento_normal = ?, tarifa_mantenimiento_tiempo_real = ?, fecha_inicio = ?, fecha_fin = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta || 0, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, id]
  );
  return result.affectedRows;
};

const softDelete = async (id) => {
  const [result] = await db.query(
    'UPDATE periodo_facturacion SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

module.exports = {
  findAll,
  findByMesAnio,
  create,
  update,
  softDelete
};

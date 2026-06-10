const db = require('./src/config/db');
async function test() {
  const [detail] = await db.query(`
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           u.id as usuario_id, u.nombre_razonsocial, u.documento_identidad, 
           u.direccion, u.telefono, u.correo,
           m.num_serie as num_medidor,
           l.lectura_actual, l.lectura_anterior, l.consumo_calculado, l.fecha_registro,
           pf.mes_anio, pf.tarifa_kwh, pf.tarifa_mantenimiento, pf.factor_multiplicador,
           pf.fecha_inicio as periodo_inicio, pf.fecha_fin as periodo_fin
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    LEFT JOIN lectura l ON l.medidor_id = m.id AND l.periodo_id = pf.id AND l.deleted_at IS NULL
    WHERE r.id = 1 AND r.deleted_at IS NULL
    LIMIT 1
  `);
  console.log("Detail of id 1:", detail);
  process.exit(0);
}
test();

const fs = require('fs');
const path = './src/repositories/reciboRepository.js';
let code = fs.readFileSync(path, 'utf8');

const findAllSinMedidorCode = `
const findAllSinMedidor = async (filters = {}) => {
  const { year, periodo } = filters;
  let query = \`
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_vencida, r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           u.nombre_razonsocial as socio, u.documento_identidad,
           pf.mes_anio as periodo
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    WHERE r.deleted_at IS NULL AND m.id IS NULL AND u.rol_id = 3
  \`;
  
  const params = [];
  if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
    query += \` AND pf.mes_anio = ?\`;
    params.push(periodo);
  } else if (year && periodo !== 'TodosHistorico') {
    query += \` AND pf.mes_anio LIKE ?\`;
    params.push(\`%\${year}%\`);
  }

  query += \` ORDER BY u.nombre_razonsocial ASC\`;
  
  const [rows] = await db.query(query, params);
  return rows;
};
\`;

code = code.replace('module.exports = {', findAllSinMedidorCode + '\nmodule.exports = {');
code = code.replace('findAllCompletos', 'findAllCompletos,\n  findAllSinMedidor');
fs.writeFileSync(path, code);
console.log("findAllSinMedidor added");

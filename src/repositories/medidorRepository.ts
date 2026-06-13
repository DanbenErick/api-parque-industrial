import db from '../config/db';

export const findAll = async () => {
  const [rows]: any = await db.query(`
    SELECT m.id, m.num_serie, m.tipo, m.operativo, m.usuario_id,
           u.nombre_razonsocial as propietario, u.documento_identidad, u.direccion,
           COALESCE(ul.lectura_actual, 0) as ultima_lectura,
           COALESCE(ul.lectura_actual_punta, 0) as ultima_lectura_punta
    FROM medidor m
    INNER JOIN usuario u ON m.usuario_id = u.id
    LEFT JOIN (
      SELECT medidor_id, lectura_actual, lectura_actual_punta,
        ROW_NUMBER() OVER (PARTITION BY medidor_id ORDER BY fecha_registro DESC) as rn
      FROM lectura
      WHERE deleted_at IS NULL
    ) ul ON ul.medidor_id = m.id AND ul.rn = 1
    WHERE m.deleted_at IS NULL
  `);
  return rows;
};

export const findByUsuario = async (usuarioId: any) => {
  const [rows]: any = await db.query(`
    SELECT m.id, m.num_serie, m.tipo, m.operativo
    FROM medidor m
    WHERE m.usuario_id = ? AND m.deleted_at IS NULL
  `, [usuarioId]);
  return rows;
};

export const create = async (medidor: any) => {
  const { usuario_id, num_serie, tipo, operativo } = medidor;
  const [result]: any = await db.query(
    `INSERT INTO medidor (usuario_id, num_serie, tipo, operativo) VALUES (?, ?, ?, ?)`,
    [usuario_id, num_serie, tipo || 'Normal', operativo !== undefined ? operativo : true]
  );
  return result.insertId;
};

export const update = async (id: any, medidor: any) => {
  const { usuario_id, num_serie, tipo, operativo } = medidor;
  const [result]: any = await db.query(
    `UPDATE medidor 
     SET usuario_id = ?, num_serie = ?, tipo = ?, operativo = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [usuario_id, num_serie, tipo || 'Normal', operativo, id]
  );
  return result.affectedRows;
};

export const softDelete = async (id: any) => {
  const [result]: any = await db.query(
    'UPDATE medidor SET deleted_at = CURRENT_TIMESTAMP, operativo = FALSE WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

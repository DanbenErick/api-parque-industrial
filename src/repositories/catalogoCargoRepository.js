const db = require('../config/db');

const findAll = async () => {
  const [rows] = await db.query(`
    SELECT c.*, 
           GROUP_CONCAT(cp.periodo_facturacion_id) as periodos_ids
    FROM catalogo_cargo c
    LEFT JOIN catalogo_cargo_periodo cp ON c.id = cp.catalogo_cargo_id
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return rows;
};

const findActivosPorPeriodo = async (periodo_id) => {
  const [rows] = await db.query(`
    SELECT c.* 
    FROM catalogo_cargo c
    LEFT JOIN catalogo_cargo_periodo cp ON c.id = cp.catalogo_cargo_id AND cp.periodo_facturacion_id = ?
    WHERE c.es_activo = TRUE 
      AND c.deleted_at IS NULL
      AND (cp.periodo_facturacion_id IS NOT NULL OR c.tipo = 'Multa')
  `, [periodo_id]);
  return rows;
};

const create = async (cargo, periodosIds) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [result] = await connection.query(`
      INSERT INTO catalogo_cargo (tipo, descripcion, monto_defecto, es_activo)
      VALUES (?, ?, ?, ?)
    `, [cargo.tipo, cargo.descripcion, cargo.monto_defecto, cargo.es_activo]);
    
    const insertId = result.insertId;

    if (periodosIds && periodosIds.length > 0) {
      const values = periodosIds.map(pid => [insertId, pid]);
      await connection.query(`
        INSERT INTO catalogo_cargo_periodo (catalogo_cargo_id, periodo_facturacion_id)
        VALUES ?
      `, [values]);
    }

    await connection.commit();
    return insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const update = async (id, cargo, periodosIds) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query(`
      UPDATE catalogo_cargo 
      SET tipo = ?, descripcion = ?, monto_defecto = ?, es_activo = ?
      WHERE id = ?
    `, [cargo.tipo, cargo.descripcion, cargo.monto_defecto, cargo.es_activo, id]);

    if (periodosIds !== undefined) {
      // Borrar antiguos
      await connection.query('DELETE FROM catalogo_cargo_periodo WHERE catalogo_cargo_id = ?', [id]);
      
      // Insertar nuevos
      if (periodosIds.length > 0) {
        const values = periodosIds.map(pid => [id, pid]);
        await connection.query(`
          INSERT INTO catalogo_cargo_periodo (catalogo_cargo_id, periodo_facturacion_id)
          VALUES ?
        `, [values]);
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const softDelete = async (id) => {
  const [result] = await db.query('UPDATE catalogo_cargo SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return result.affectedRows;
};

module.exports = {
  findAll,
  findActivosPorPeriodo,
  create,
  update,
  softDelete
};

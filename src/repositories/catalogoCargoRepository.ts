import { Database } from '../config/db';

export class CatalogoCargoRepository {
    constructor(private db: Database) {}
    public findAll = async (): Promise<any[]> => {
          const [rows]: any = await this.db.query(`
    SELECT c.*, 
           GROUP_CONCAT(cp.periodo_facturacion_id) as periodos_ids
    FROM catalogo_cargo c
    LEFT JOIN catalogo_cargo_periodo cp ON c.id = cp.catalogo_cargo_id
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
          return rows as any[];
        };
    public findActivosPorPeriodo = async (periodo_id: any) => {
          const [rows] = await this.db.query(`
    SELECT c.* 
    FROM catalogo_cargo c
    LEFT JOIN catalogo_cargo_periodo cp ON c.id = cp.catalogo_cargo_id AND cp.periodo_facturacion_id = ?
    WHERE c.es_activo = TRUE 
      AND c.deleted_at IS NULL
      AND (cp.periodo_facturacion_id IS NOT NULL OR c.tipo = 'Multa')
  `, [periodo_id]);
          return rows;
        };
    public create = async (cargo: any, periodosIds: any[]) => {
          const connection = await this.db.getConnection();
          await connection.beginTransaction();

          try {
            const [result]: any = await connection.query(`
      INSERT INTO catalogo_cargo (tipo, descripcion, monto_defecto, es_activo)
      VALUES (?, ?, ?, ?)
    `, [cargo.tipo, cargo.descripcion, cargo.monto_defecto, cargo.es_activo]);
            
            const insertId = result.insertId;

            if (periodosIds && periodosIds.length > 0) {
              const values = periodosIds.map((pid: any) => [insertId, pid]);
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
    public update = async (id: any, cargo: any, periodosIds: any[]) => {
          const connection = await this.db.getConnection();
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
                const values = periodosIds.map((pid: any) => [id, pid]);
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
    public softDelete = async (id: any) => {
          const [result]: any = await this.db.query('UPDATE catalogo_cargo SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
          return result.affectedRows;
        };
}



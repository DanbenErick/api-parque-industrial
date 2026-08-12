import { Database } from '../config/db';

export class CargoPersonalizadoRepository {
  constructor(private db: Database) {}

  public findAllPendientes = async (periodo_id: any): Promise<any[]> => {
    const [rows]: any = await this.db.query(`
      SELECT cp.*, u.nombre_razonsocial as socio, u.documento_identidad
      FROM cargo_personalizado cp
      INNER JOIN usuario u ON cp.usuario_id = u.id
      WHERE cp.periodo_id = ? AND cp.estado = 'Pendiente' AND cp.deleted_at IS NULL
    `, [periodo_id]);
    return rows;
  };

  public findPendientesPorUsuario = async (periodo_id: any, usuario_id: any): Promise<any[]> => {
    const [rows]: any = await this.db.query(`
      SELECT *
      FROM cargo_personalizado
      WHERE periodo_id = ? AND usuario_id = ? AND estado = 'Pendiente' AND deleted_at IS NULL
    `, [periodo_id, usuario_id]);
    return rows;
  };

  public create = async (cargo: any) => {
    const { usuario_id, periodo_id, descripcion, monto, created_by } = cargo;
    const [result]: any = await this.db.query(`
      INSERT INTO cargo_personalizado (usuario_id, periodo_id, descripcion, monto, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [usuario_id, periodo_id, descripcion, monto, created_by]);
    return result.insertId;
  };

  public marcarComoFacturados = async (ids: any[], connection: any) => {
    if (!ids || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await connection.query(`
      UPDATE cargo_personalizado
      SET estado = 'Facturado'
      WHERE id IN (${placeholders})
    `, ids);
  };

  public softDelete = async (id: any) => {
    const [result]: any = await this.db.query(`
      UPDATE cargo_personalizado 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND estado = 'Pendiente'
    `, [id]);
    return result.affectedRows;
  };
}

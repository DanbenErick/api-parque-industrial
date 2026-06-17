import { Database } from '../config/db';

export class PeriodoRepository {
    constructor(private db: Database) {}
    public findAll = async (page: number = 1, limit: number = 50): Promise<any[]> => {
          const offset = (page - 1) * limit;
          const [rows]: any = await this.db.query('SELECT * FROM periodo_facturacion WHERE deleted_at IS NULL ORDER BY fecha_inicio DESC LIMIT ? OFFSET ?', [limit, offset]);
          return rows;
        };
    public findByMesAnio = async (mes_anio: string): Promise<any> => {
          const [rows]: any = await this.db.query('SELECT id FROM periodo_facturacion WHERE mes_anio = ? AND deleted_at IS NULL', [mes_anio]);
          return rows[0] || null;
        };
    public create = async (periodo: any): Promise<number> => {
          const { mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin } = periodo;
          const [result]: any = await this.db.query(
            `INSERT INTO periodo_facturacion (
      mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [mes_anio, factor_multiplicador || 1.0000, tarifa_kwh, tarifa_kwh_punta || 0, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin]
          );
          return result.insertId;
        };
    public update = async (id: number, periodo: any): Promise<number> => {
          const { mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin } = periodo;
          const [result]: any = await this.db.query(
            `UPDATE periodo_facturacion 
     SET mes_anio = ?, factor_multiplicador = ?, tarifa_kwh = ?, tarifa_kwh_punta = ?,
         tarifa_mantenimiento_normal = ?, tarifa_mantenimiento_tiempo_real = ?, fecha_inicio = ?, fecha_fin = ?
     WHERE id = ? AND deleted_at IS NULL`,
            [mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_punta || 0, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, id]
          );
          return result.affectedRows;
        };
    public softDelete = async (id: number): Promise<number> => {
          const [result]: any = await this.db.query(
            'UPDATE periodo_facturacion SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
          );
          return result.affectedRows;
        };
}



import { Database } from '../config/db';

export class PeriodoRepository {
    constructor(private db: Database) {}
    public findAll = async (): Promise<any[]> => {
          const [rows]: any = await this.db.query(`
            SELECT p.*, u.nombre_razonsocial as creador_nombre 
            FROM periodo_facturacion p
            LEFT JOIN usuario u ON p.created_by = u.id
            WHERE p.deleted_at IS NULL 
            ORDER BY p.fecha_inicio DESC
          `);
          return rows;
        };
    public findByMesAnio = async (mes_anio: string): Promise<any> => {
          const [rows]: any = await this.db.query('SELECT id FROM periodo_facturacion WHERE mes_anio = ? AND deleted_at IS NULL', [mes_anio]);
          return rows[0] || null;
        };
    public getStats = async (mes_anio: string): Promise<any> => {
          const [medidores]: any = await this.db.query('SELECT COUNT(id) as total FROM medidor WHERE deleted_at IS NULL');
          const [lecturas]: any = await this.db.query('SELECT COUNT(l.id) as total FROM lectura l JOIN periodo_facturacion pf ON l.periodo_id = pf.id WHERE pf.mes_anio = ? AND l.deleted_at IS NULL', [mes_anio]);
          return {
            total_medidores: medidores[0]?.total || 0,
            total_registrados: lecturas[0]?.total || 0
          };
        };
    public create = async (periodo: any): Promise<number> => {
          const { mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_tr, tarifa_kwh_punta, costo_potencia, costo_potencia_fuera_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, fecha_emision_recibo, fecha_vencimiento, fecha_corte, fecha_inicio_lectura, fecha_fin_lectura, created_by } = periodo;
          const [result]: any = await this.db.query(
            `INSERT INTO periodo_facturacion (
      mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_tr, tarifa_kwh_punta, costo_potencia, costo_potencia_fuera_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, fecha_emision_recibo, fecha_vencimiento, fecha_corte, fecha_inicio_lectura, fecha_fin_lectura, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [mes_anio, factor_multiplicador || 1.0000, tarifa_kwh, tarifa_kwh_tr || 0, tarifa_kwh_punta || 0, costo_potencia || 0, costo_potencia_fuera_punta || 0, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, fecha_emision_recibo, fecha_vencimiento, fecha_corte, fecha_inicio_lectura, fecha_fin_lectura, created_by]
          );
          return result.insertId;
        };
    public update = async (id: number, periodo: any): Promise<number> => {
          const { mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_tr, tarifa_kwh_punta, costo_potencia, costo_potencia_fuera_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, fecha_emision_recibo, fecha_vencimiento, fecha_corte, fecha_inicio_lectura, fecha_fin_lectura } = periodo;
          const [result]: any = await this.db.query(
            `UPDATE periodo_facturacion 
     SET mes_anio = ?, factor_multiplicador = ?, tarifa_kwh = ?, tarifa_kwh_tr = ?, tarifa_kwh_punta = ?, costo_potencia = ?, costo_potencia_fuera_punta = ?,
         tarifa_mantenimiento_normal = ?, tarifa_mantenimiento_tiempo_real = ?, fecha_inicio = ?, fecha_fin = ?, fecha_emision_recibo = ?, fecha_vencimiento = ?, fecha_corte = ?, fecha_inicio_lectura = ?, fecha_fin_lectura = ?
     WHERE id = ? AND deleted_at IS NULL`,
            [mes_anio, factor_multiplicador, tarifa_kwh, tarifa_kwh_tr || 0, tarifa_kwh_punta || 0, costo_potencia || 0, costo_potencia_fuera_punta || 0, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, fecha_inicio, fecha_fin, fecha_emision_recibo, fecha_vencimiento, fecha_corte, fecha_inicio_lectura, fecha_fin_lectura, id]
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



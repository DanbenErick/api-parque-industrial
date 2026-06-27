import { Database } from '../config/db';
import { ILectura } from '../types';

export class LecturaRepository {
    constructor(private db: Database) {}
    public findAll = async (page: number = 1, limit: number = 500, mes_anio?: string): Promise<ILectura[]> => {
          const offset = (page - 1) * limit;
          let whereClause = `WHERE l.deleted_at IS NULL`;
          const params: any[] = [];
          
          if (mes_anio) {
            whereClause += ` AND pf.mes_anio = ?`;
            params.push(mes_anio);
          }
          
          params.push(limit, offset);

          const [rows]: any = await this.db.query(`
    SELECT l.id, l.lectura_anterior, l.lectura_actual, l.consumo_calculado, 
           l.lectura_anterior_punta, l.lectura_actual_punta, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia,
           l.fecha_registro, l.estado, l.justificacion,
           l.es_cambio_medidor, l.lectura_final_viejo, l.lectura_inicial_nuevo,
           l.lectura_final_viejo_punta, l.lectura_inicial_nuevo_punta,
           l.lectura_actual_original, l.lectura_actual_punta_original, l.factor_potencia_original,
           m.num_serie, m.tipo as medidor_tipo,
           u.nombre_razonsocial as propietario, u.direccion,
           op.nombre_razonsocial as operario,
           pf.mes_anio as periodo, pf.tarifa_kwh, pf.tarifa_kwh_punta, pf.factor_multiplicador
    FROM lectura l
    INNER JOIN medidor m ON l.medidor_id = m.id
    INNER JOIN usuario u ON m.usuario_id = u.id
    INNER JOIN usuario op ON l.operario_id = op.id
    INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    ${whereClause}
    ORDER BY l.fecha_registro DESC
    LIMIT ? OFFSET ?
  `, params);
          return rows;
        };
    public findByUsuario = async (usuarioId: number): Promise<ILectura[]> => {
          const [rows]: any = await this.db.query(`
    SELECT l.id, l.lectura_anterior, l.lectura_actual, l.consumo_calculado, 
           l.lectura_anterior_punta, l.lectura_actual_punta, l.consumo_calculado_punta, l.factor_potencia,
           l.fecha_registro, l.estado, l.justificacion,
           l.es_cambio_medidor, l.lectura_final_viejo, l.lectura_inicial_nuevo,
           l.lectura_final_viejo_punta, l.lectura_inicial_nuevo_punta,
           l.lectura_actual_original, l.lectura_actual_punta_original, l.factor_potencia_original,
           m.num_serie, pf.mes_anio as periodo
    FROM lectura l
    INNER JOIN medidor m ON l.medidor_id = m.id
    INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    WHERE m.usuario_id = ? AND l.deleted_at IS NULL
    ORDER BY l.fecha_registro DESC
  `, [usuarioId]);
          return rows;
        };
    public create = async (lecturaData: Partial<ILectura>): Promise<number> => {
          const { 
            medidor_id, operario_id, periodo_id, 
            lectura_anterior, lectura_actual, 
            lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
            estado,
            consumo_calculado, es_cambio_medidor, 
            lectura_final_viejo, lectura_inicial_nuevo,
            lectura_final_viejo_punta, lectura_inicial_nuevo_punta
          } = lecturaData;
          const [result]: any = await this.db.query(
            `INSERT INTO lectura (
      medidor_id, operario_id, periodo_id, 
      lectura_anterior, lectura_actual, 
      lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
      estado,
      consumo_calculado, es_cambio_medidor, 
      lectura_final_viejo, lectura_inicial_nuevo,
      lectura_final_viejo_punta, lectura_inicial_nuevo_punta
    ) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              medidor_id, operario_id, periodo_id, 
              lectura_anterior, lectura_actual, 
              lectura_anterior_punta || 0, lectura_actual_punta || 0, factor_potencia || 0, precio_factor_potencia || 0,
              estado || 'Validado',
              consumo_calculado || 0, 
              es_cambio_medidor || false, 
              lectura_final_viejo || null, 
              lectura_inicial_nuevo || null,
              lectura_final_viejo_punta || null,
              lectura_inicial_nuevo_punta || null
            ]
          );
          return result.insertId;
        };
    public update = async (id: number, lecturaData: Partial<ILectura>): Promise<number> => {
          const { 
            lectura_anterior, lectura_actual, 
            lectura_anterior_punta, lectura_actual_punta, factor_potencia,
            estado, justificacion,
            consumo_calculado, es_cambio_medidor, 
            lectura_final_viejo, lectura_inicial_nuevo,
            lectura_final_viejo_punta, lectura_inicial_nuevo_punta,
            lectura_actual_original, lectura_actual_punta_original, factor_potencia_original
          } = lecturaData;
          const [result]: any = await this.db.query(
            `UPDATE lectura 
             SET lectura_anterior = ?, lectura_actual = ?, 
                 lectura_anterior_punta = ?, lectura_actual_punta = ?, factor_potencia = ?,
                 estado = ?, justificacion = ?,
                 consumo_calculado = ?, es_cambio_medidor = ?, 
                 lectura_final_viejo = ?, lectura_inicial_nuevo = ?,
                 lectura_final_viejo_punta = ?, lectura_inicial_nuevo_punta = ?,
                 lectura_actual_original = ?, lectura_actual_punta_original = ?, factor_potencia_original = ?
             WHERE id = ? AND deleted_at IS NULL`,
            [
              lectura_anterior, lectura_actual, 
              lectura_anterior_punta || 0, lectura_actual_punta || 0, factor_potencia || 0,
              estado, justificacion,
              consumo_calculado, es_cambio_medidor || false, 
              lectura_final_viejo || null, lectura_inicial_nuevo || null,
              lectura_final_viejo_punta || null, lectura_inicial_nuevo_punta || null,
              lectura_actual_original !== undefined ? lectura_actual_original : null,
              lectura_actual_punta_original !== undefined ? lectura_actual_punta_original : null,
              factor_potencia_original !== undefined ? factor_potencia_original : null,
              id
            ]
          );
          return result.affectedRows;
        };
    public softDelete = async (id: number): Promise<number> => {
          const [result]: any = await this.db.query(
            'UPDATE lectura SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
          );
          return result.affectedRows;
        };
    public findByMedidorAndPeriodo = async (medidor_id: number, periodo_id: number): Promise<ILectura | undefined> => {
          const [rows]: any = await this.db.query(
            'SELECT id, lectura_anterior, lectura_actual, consumo_calculado, lectura_anterior_punta, lectura_actual_punta, consumo_calculado_punta, factor_potencia, estado FROM lectura WHERE medidor_id = ? AND periodo_id = ? AND deleted_at IS NULL LIMIT 1',
            [medidor_id, periodo_id]
          );
          return rows[0];
        };
}



import { Database } from '../config/db';
import { IPaginatedResult, IUsuario } from '../types';
import { EstadoRecibo } from '../types/enums';


export class UsuarioRepository {
    constructor(private db: Database) {}
    public findAll = async (search: string = '', rol_id: number | null = null, estado: any = null, rubro: string | null = null, limit: number = 30, offset: number = 0): Promise<IPaginatedResult<IUsuario>> => {
          let baseQuery = `
    FROM usuario u
    INNER JOIN rol r ON u.rol_id = r.id
    LEFT JOIN (
      SELECT usuario_id, 
        SUM(total) as deuda_total, 
        COUNT(*) as recibos_pendientes
      FROM recibo 
      WHERE estado = '${EstadoRecibo.PENDIENTE}' AND deleted_at IS NULL
      GROUP BY usuario_id
    ) rp ON rp.usuario_id = u.id
    WHERE u.deleted_at IS NULL
  `;
          const params = [];

          if (rol_id) {
            baseQuery += ` AND u.rol_id = ?`;
            params.push(rol_id);
          }

          if (estado !== null && estado !== undefined && estado !== '') {
            if (estado === 'activos' || estado === '1' || estado === 1) {
              baseQuery += ` AND u.es_activo = 1`;
            } else if (estado === 'suspendidos' || estado === 'inactivos' || estado === '0' || estado === 0) {
              baseQuery += ` AND u.es_activo = 0`;
            }
          }

          if (rubro && rubro !== 'Todos' && rubro !== '') {
            baseQuery += ` AND u.actividad_rubro = ?`;
            params.push(rubro);
          }

          if (search && search.trim() !== '') {
            baseQuery += ` AND (u.nombre_razonsocial LIKE ? OR u.documento_identidad LIKE ?)`;
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm);
          }

          const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
          const [countRows]: any = await this.db.query(countQuery, params);
          const total = countRows[0].total;

          let query = `
    SELECT u.id, u.documento_identidad, u.nombre_razonsocial, u.cargo_representante, 
           u.telefono, u.correo, u.direccion, u.es_activo, u.ultimo_acceso, u.actividad_rubro, u.saldo_a_favor,
           r.nombre_rol, r.id as rol_id,
           (
             SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', id, 'num_serie', num_serie, 'tipo', tipo, 'lectura_inicial', lectura_inicial, 'lectura_inicial_punta', lectura_inicial_punta) SEPARATOR ','), ']')
             FROM medidor 
             WHERE usuario_id = u.id AND deleted_at IS NULL
           ) as medidores,
           COALESCE(rp.deuda_total, 0) as deuda_total,
           COALESCE(rp.recibos_pendientes, 0) as recibos_pendientes
    ${baseQuery}
    ORDER BY u.created_at DESC 
    LIMIT ? OFFSET ?
  `;
          
          params.push(Number(limit), Number(offset));

          const [rows]: any = await this.db.query(query, params);
          return {
            data: rows,
            meta: {
              total,
              limit: Number(limit),
              offset: Number(offset)
            }
          };
        };
    public getStats = async (rol_id: number | null = null): Promise<any> => {
          let query = `
    SELECT 
      COUNT(*) as total, 
      SUM(CASE WHEN es_activo = 1 THEN 1 ELSE 0 END) as activos, 
      SUM(CASE WHEN es_activo = 0 THEN 1 ELSE 0 END) as inactivos
    FROM usuario 
    WHERE deleted_at IS NULL
  `;
          const params = [];
          
          if (rol_id) {
            query += ` AND rol_id = ?`;
            params.push(rol_id);
          }
          
          const [rows]: any = await this.db.query(query, params);

          // Obtener estadísticas de medidores solo para socios
          let statsMedidores = { normal: 0, tiempoReal: 0, sinMedidor: 0 };
          
          if (rol_id === 3) {
            const medidoresQuery = `
              SELECT 
                SUM(CASE WHEN m.tipo = 'Normal' THEN 1 ELSE 0 END) as medidores_normal,
                SUM(CASE WHEN m.tipo = 'Hora Punta' THEN 1 ELSE 0 END) as medidores_tiempo_real
              FROM medidor m
              JOIN usuario u ON m.usuario_id = u.id
              WHERE m.deleted_at IS NULL AND u.deleted_at IS NULL AND u.rol_id = 3
            `;
            const [medidoresRows]: any = await this.db.query(medidoresQuery);
            
            const sinMedidorQuery = `
              SELECT COUNT(*) as sin_medidor
              FROM usuario u
              LEFT JOIN medidor m ON u.id = m.usuario_id AND m.deleted_at IS NULL
              WHERE u.deleted_at IS NULL AND u.rol_id = 3 AND m.id IS NULL
            `;
            const [sinMedidorRows]: any = await this.db.query(sinMedidorQuery);

            statsMedidores = {
              normal: parseInt(medidoresRows[0].medidores_normal) || 0,
              tiempoReal: parseInt(medidoresRows[0].medidores_tiempo_real) || 0,
              sinMedidor: parseInt(sinMedidorRows[0].sin_medidor) || 0
            };
          }
          
          // En caso de que no haya registros, los SUM devuelven NULL, los convertimos a 0
          return {
            total: rows[0].total || 0,
            activos: rows[0].activos || 0,
            inactivos: rows[0].inactivos || 0,
            medidores_normal: statsMedidores.normal,
            medidores_tiempo_real: statsMedidores.tiempoReal,
            socios_sin_medidor: statsMedidores.sinMedidor
          };
        };
    public create = async (usuarioData: any): Promise<number> => {
          const { rol_id, documento_identidad, nombre_razonsocial, clave_acceso, cargo_representante, telefono, correo, direccion, actividad_rubro, es_activo } = usuarioData;
          const [result]: any = await this.db.query(
            `INSERT INTO usuario (
      rol_id, documento_identidad, nombre_razonsocial, clave_acceso, 
      cargo_representante, telefono, correo, direccion, actividad_rubro
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rol_id, documento_identidad, nombre_razonsocial, clave_acceso, cargo_representante, telefono, correo, direccion || null, actividad_rubro || null]
          );
          return result.insertId;
        };
    public update = async (id: number, usuarioData: any): Promise<number> => {
          const { rol_id, documento_identidad, nombre_razonsocial, cargo_representante, telefono, correo, direccion, actividad_rubro, es_activo } = usuarioData;
          const [result]: any = await this.db.query(
            `UPDATE usuario 
     SET rol_id = ?, documento_identidad = ?, nombre_razonsocial = ?, 
         cargo_representante = ?, telefono = ?, correo = ?, 
         direccion = ?, es_activo = ?, actividad_rubro = ?
     WHERE id = ? AND deleted_at IS NULL`,
            [rol_id, documento_identidad, nombre_razonsocial, cargo_representante, telefono, correo, direccion || null, es_activo, actividad_rubro || null, id]
          );
          return result.affectedRows;
        };
    
    public updatePassword = async (id: number, hashedPass: string): Promise<number> => {
      const [result]: any = await this.db.query(
        'UPDATE usuario SET clave_acceso = ? WHERE id = ? AND deleted_at IS NULL',
        [hashedPass, id]
      );
      return result.affectedRows;
    };

    public softDelete = async (id: number): Promise<number> => {
          const [result]: any = await this.db.query(
            'UPDATE usuario SET deleted_at = CURRENT_TIMESTAMP, es_activo = FALSE WHERE id = ?',
            [id]
          );
          return result.affectedRows;
        };
    public findById = async (id: number): Promise<IUsuario | null> => {
          const [rows]: any = await this.db.query(`
    SELECT u.id, u.documento_identidad, u.nombre_razonsocial, u.cargo_representante, 
           u.telefono, u.correo, u.direccion, u.es_activo, u.ultimo_acceso,
           r.nombre_rol, r.id as rol_id,
           (
             SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', id, 'num_serie', num_serie, 'tipo', tipo, 'lectura_inicial', lectura_inicial, 'lectura_inicial_punta', lectura_inicial_punta) SEPARATOR ','), ']')
             FROM medidor 
             WHERE usuario_id = u.id AND deleted_at IS NULL
           ) as medidores
    FROM usuario u
    INNER JOIN rol r ON u.rol_id = r.id
    WHERE u.id = ? AND u.deleted_at IS NULL
  `, [id]);
          return rows[0];
        };

    public findByDocumento = async (documento: string): Promise<IUsuario | null> => {
          const [rows]: any = await this.db.query(`SELECT id FROM usuario WHERE documento_identidad = ? AND deleted_at IS NULL LIMIT 1`, [documento]);
          return rows[0] || null;
        };
}



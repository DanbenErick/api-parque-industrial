import { Database } from '../config/db';

export class MedidorRepository {
    constructor(private db: Database) {}
    public findAll = async (search: string = '') => {
          let baseQuery = `
    FROM medidor m
    INNER JOIN usuario u ON m.usuario_id = u.id
    LEFT JOIN (
      SELECT medidor_id, lectura_actual, lectura_actual_punta,
        ROW_NUMBER() OVER (PARTITION BY medidor_id ORDER BY fecha_registro DESC) as rn
      FROM lectura
      WHERE deleted_at IS NULL
    ) ul ON ul.medidor_id = m.id AND ul.rn = 1
    WHERE m.deleted_at IS NULL
  `;
          const params = [];

          if (search && search.trim() !== '') {
            baseQuery += ` AND (m.num_serie LIKE ? OR u.documento_identidad LIKE ? OR u.nombre_razonsocial LIKE ?)`;
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
          }

          const [rows]: any = await this.db.query(`
    SELECT m.id, m.num_serie, m.tipo, m.operativo, m.usuario_id,
           m.lectura_inicial, m.lectura_inicial_punta,
           u.nombre_razonsocial as propietario, u.documento_identidad, u.direccion,
           COALESCE(ul.lectura_actual, m.lectura_inicial, 0) as ultima_lectura,
           COALESCE(ul.lectura_actual_punta, m.lectura_inicial_punta, 0) as ultima_lectura_punta
    ${baseQuery}
    ORDER BY u.nombre_razonsocial ASC
    LIMIT 50
  `, params);
          return rows;
        };
    public findByUsuario = async (usuarioId: any) => {
          const [rows]: any = await this.db.query(`
    SELECT m.id, m.num_serie, m.tipo, m.operativo
    FROM medidor m
    WHERE m.usuario_id = ? AND m.deleted_at IS NULL
  `, [usuarioId]);
          return rows;
        };
    public create = async (medidor: any) => {
          const { usuario_id, num_serie, tipo, operativo, lectura_inicial, lectura_inicial_punta } = medidor;
          const [result]: any = await this.db.query(
            `INSERT INTO medidor (usuario_id, num_serie, tipo, operativo, lectura_inicial, lectura_inicial_punta) VALUES (?, ?, ?, ?, ?, ?)`,
            [usuario_id, num_serie, tipo || 'Normal', operativo !== undefined ? operativo : true, lectura_inicial || 0, lectura_inicial_punta || 0]
          );
          return result.insertId;
        };
    public update = async (id: any, medidor: any) => {
          const { usuario_id, num_serie, tipo, operativo, lectura_inicial, lectura_inicial_punta } = medidor;
          const [result]: any = await this.db.query(
            `UPDATE medidor 
             SET usuario_id = ?, num_serie = ?, tipo = ?, operativo = ?,
                 lectura_inicial = COALESCE(?, lectura_inicial),
                 lectura_inicial_punta = COALESCE(?, lectura_inicial_punta)
             WHERE id = ? AND deleted_at IS NULL`,
            [usuario_id, num_serie, tipo || 'Normal', operativo, lectura_inicial, lectura_inicial_punta, id]
          );
          return result.affectedRows;
        };
    public softDelete = async (id: any) => {
          const [result]: any = await this.db.query(
            'UPDATE medidor SET deleted_at = CURRENT_TIMESTAMP, operativo = FALSE WHERE id = ?',
            [id]
          );
          return result.affectedRows;
        };
}



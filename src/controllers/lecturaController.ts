import { Request, Response } from 'express';
import { LecturaRepository } from '../repositories/lecturaRepository';;
import { Database } from '../config/db';
import { RolUsuario } from '../types/enums';


interface ICreateLecturaBody {
  medidor_id: number;
  periodo_id: number;
  lectura_anterior: number;
  lectura_actual: number;
  lectura_anterior_punta?: number;
  lectura_actual_punta?: number;
  factor_potencia?: number;
  precio_factor_potencia?: number;
  estado?: string;
  es_cambio_medidor?: boolean;
  lectura_final_viejo?: number;
  lectura_inicial_nuevo?: number;
  lectura_final_viejo_punta?: number;
  lectura_inicial_nuevo_punta?: number;
}

interface IUpdateLecturaBody {
  lectura_anterior: number;
  lectura_actual: number;
  lectura_anterior_punta?: number;
  lectura_actual_punta?: number;
  es_cambio_medidor?: boolean;
  lectura_final_viejo?: number;
  lectura_inicial_nuevo?: number;
  lectura_final_viejo_punta?: number;
  lectura_inicial_nuevo_punta?: number;
  consumo_calculado?: number;
}

interface IUltimasLecturasQuery {
  year?: string;
}

interface IAutocompleteQuery {
  q?: string;
}

export class LecturaController {
    constructor(private lecturaRepo: LecturaRepository, private db: Database) {}

    public getLecturas = async (req: Request, res: Response): Promise<any> => {
          try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 500;
            const periodo = req.query.periodo as string;
            
            const lecturas = await this.lecturaRepo.findAll(page, limit, periodo);
            res.json(lecturas);
          } catch (error) {
            console.error('Error al obtener lecturas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getLecturasByUsuario = async (req: Request<{ usuarioId: string }>, res: Response): Promise<any> => {
          const { usuarioId } = req.params;

          if (req.user?.nombre_rol === RolUsuario.SOCIO && req.user.id !== parseInt(usuarioId as string)) {
            return res.status(403).json({ error: 'No tienes permisos para ver estas lecturas' });
          }

          try {
            const lecturas = await this.lecturaRepo.findByUsuario(usuarioId as any);
            res.json(lecturas);
          } catch (error) {
            console.error('Error al obtener lecturas por usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public createLectura = async (req: Request<{}, any, ICreateLecturaBody>, res: Response): Promise<any> => {
          const { 
            medidor_id, periodo_id, 
            lectura_anterior, lectura_actual, 
            lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
            estado,
            es_cambio_medidor, 
            lectura_final_viejo, lectura_inicial_nuevo,
            lectura_final_viejo_punta, lectura_inicial_nuevo_punta
          } = req.body;
          const operario_id = req.user?.id;

          if (!es_cambio_medidor && Number(lectura_actual) < Number(lectura_anterior)) {
            return res.status(400).json({ error: 'La lectura actual no puede ser menor a la lectura anterior.' });
          }

          let consumo_calculado = 0;
          if (es_cambio_medidor) {
            let consumo_viejo = Number(lectura_final_viejo) - Number(lectura_anterior);
            if (consumo_viejo < 0) consumo_viejo = 0;
            
            let consumo_nuevo = Number(lectura_actual) - Number(lectura_inicial_nuevo);
            if (consumo_nuevo < 0) consumo_nuevo = 0;
            
            consumo_calculado = consumo_viejo + consumo_nuevo;
          } else {
            consumo_calculado = Number(lectura_actual) - Number(lectura_anterior);
            if (consumo_calculado < 0) consumo_calculado = 0;
          }

          try {
            const existingLectura = await this.lecturaRepo.findByMedidorAndPeriodo(medidor_id, periodo_id);
            if (existingLectura) {
              return res.status(400).json({ error: 'Ya existe una lectura registrada para este medidor en el periodo activo.' });
            }

            const insertId = await this.lecturaRepo.create({
              medidor_id, operario_id, periodo_id, 
              lectura_anterior, lectura_actual, 
              lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
              estado,
              consumo_calculado, es_cambio_medidor, 
              lectura_final_viejo, lectura_inicial_nuevo,
              lectura_final_viejo_punta, lectura_inicial_nuevo_punta
            });
            res.status(201).json({ message: 'Lectura registrada exitosamente', id: insertId });
          } catch (error) {
            console.error('Error al crear lectura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public updateLectura = async (req: Request<{ id: string }, any, IUpdateLecturaBody>, res: Response): Promise<any> => {
          const { id } = req.params;
          const { 
            lectura_anterior, lectura_actual, 
            lectura_anterior_punta, lectura_actual_punta, 
            es_cambio_medidor, 
            lectura_final_viejo, lectura_inicial_nuevo,
            lectura_final_viejo_punta, lectura_inicial_nuevo_punta
          } = req.body;

          if (!es_cambio_medidor && Number(lectura_actual) < Number(lectura_anterior)) {
            return res.status(400).json({ error: 'La lectura actual no puede ser menor a la lectura anterior.' });
          }
          if (!es_cambio_medidor && lectura_actual_punta !== undefined && lectura_anterior_punta !== undefined && Number(lectura_actual_punta) < Number(lectura_anterior_punta)) {
            return res.status(400).json({ error: 'La lectura actual punta no puede ser menor a la lectura anterior punta.' });
          }

          let consumo_calculado = 0;
          if (es_cambio_medidor) {
            let consumo_viejo = Number(lectura_final_viejo) - Number(lectura_anterior);
            if (consumo_viejo < 0) consumo_viejo = 0;
            
            let consumo_nuevo = Number(lectura_actual) - Number(lectura_inicial_nuevo);
            if (consumo_nuevo < 0) consumo_nuevo = 0;
            
            consumo_calculado = consumo_viejo + consumo_nuevo;
          } else {
            consumo_calculado = Number(lectura_actual) - Number(lectura_anterior);
            if (consumo_calculado < 0) consumo_calculado = 0;
          }

          // Actualizamos req.body con los nuevos calculos para que se pasen al repository
          req.body.consumo_calculado = consumo_calculado;

          try {
            // Fetch current record to see if we need to preserve original values
            const [existingRows]: any = await this.lecturaRepo['db'].query(
              'SELECT lectura_actual, lectura_actual_punta, factor_potencia, lectura_actual_original FROM lectura WHERE id = ?', 
              [id]
            );
            
            if (existingRows.length > 0) {
              const existing = existingRows[0];
              // Only set original values if they haven't been set yet (first modification)
              if (existing.lectura_actual_original === null) {
                (req.body as any).lectura_actual_original = existing.lectura_actual;
                (req.body as any).lectura_actual_punta_original = existing.lectura_actual_punta;
                (req.body as any).factor_potencia_original = existing.factor_potencia;
              }
            }

            const affectedRows = await this.lecturaRepo.update(id as any, req.body);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Lectura no encontrada' });
            }

            res.json({ message: 'Lectura actualizada exitosamente' });
          } catch (error) {
            console.error('Error al actualizar lectura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public deleteLectura = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const { id } = req.params;

          try {
            const affectedRows = await this.lecturaRepo.softDelete(id as any);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Lectura no encontrada' });
            }

            res.json({ message: 'Lectura eliminada exitosamente' });
          } catch (error) {
            console.error('Error al eliminar lectura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getUltimasLecturas = async (req: Request<{}, any, any, IUltimasLecturasQuery>, res: Response): Promise<any> => {
          try {
            const year = req.query.year;
            let query = `
      SELECT l.id, u.nombre_razonsocial as company, u.direccion as sector, l.consumo_calculado as value
      FROM lectura l
      JOIN medidor m ON l.medidor_id = m.id
      JOIN usuario u ON m.usuario_id = u.id
      JOIN periodo_facturacion pf ON l.periodo_id = pf.id
      WHERE l.deleted_at IS NULL
    `;
            const params = [];
            if (year && year !== 'all') {
              query += ` AND pf.fecha_inicio >= ? AND pf.fecha_inicio < ?`;
              params.push(`${year as string}-01-01`, `${parseInt(year as string) + 1}-01-01`);
            }
            query += ` ORDER BY pf.fecha_inicio DESC, l.fecha_registro DESC LIMIT 5`;

            const [rows]: any = await this.db.query(query, params);
            
            const lecturasFormateadas = rows.map((r: any) => ({
              id: r.id,
              company: r.company,
              sector: r.sector || 'N/A',
              value: parseFloat(r.value).toFixed(2),
              trend: parseFloat(r.value) > 500 ? 'ALTA' : (parseFloat(r.value) < 100 ? 'BAJA' : 'NORMAL')
            }));

            res.json(lecturasFormateadas);
          } catch (error) {
            console.error('Error al obtener últimas lecturas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getSociosAutocomplete = async (req: Request<{}, any, any, IAutocompleteQuery>, res: Response): Promise<any> => {
          const { q } = req.query;
          try {
            const queryStr = q ? `%${q}%` : '%';
            const [rows]: any = await this.db.query(`
      SELECT DISTINCT u.nombre_razonsocial as name
      FROM usuario u
      INNER JOIN rol r ON u.rol_id = r.id
      WHERE r.nombre_rol = RolUsuario.SOCIO AND u.deleted_at IS NULL AND u.nombre_razonsocial LIKE ?
      ORDER BY u.nombre_razonsocial ASC
      LIMIT 15
    `, [queryStr]);
            
            const names = rows.map((r: any) => r.name);
            res.json(names);
          } catch (error) {
            console.error('Error al autocompletar socios:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
}



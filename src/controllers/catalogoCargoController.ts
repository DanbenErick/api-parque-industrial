import { Request, Response } from 'express';
import { CatalogoCargoRepository } from '../repositories/catalogoCargoRepository';

interface ICreateCargoBody {
  tipo: string;
  descripcion: string;
  monto_defecto: number;
  es_activo?: boolean;
  periodos_ids?: number[];
}

interface IUpdateCargoBody {
  tipo?: string;
  descripcion?: string;
  monto_defecto?: number;
  es_activo?: boolean;
  periodos_ids?: number[];
}

export class CatalogoCargoController {
    constructor(private catalogoRepo: CatalogoCargoRepository) {}

    public getAll = async (req: Request, res: Response): Promise<any> => {
          try {
            const cargos = await this.catalogoRepo.findAll();
            // Parse periodos_ids
            const data = cargos.map(c => ({
              ...c,
              periodos_ids: c.periodos_ids ? c.periodos_ids.split(',').map(Number) : []
            }));
            res.json(data);
          } catch (error) {
            console.error('Error al obtener catalogo de cargos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getActivosPorPeriodo = async (req: Request<{ periodo_id: string }>, res: Response): Promise<any> => {
          const { periodo_id } = req.params;
          try {
            const cargos = await this.catalogoRepo.findActivosPorPeriodo(Number(periodo_id));
            res.json(cargos);
          } catch (error) {
            console.error('Error al obtener cargos por periodo:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public create = async (req: Request<{}, any, ICreateCargoBody>, res: Response): Promise<any> => {
          const { tipo, descripcion, monto_defecto, es_activo, periodos_ids } = req.body;
          if (!tipo || !descripcion || monto_defecto === undefined) {
            res.status(400).json({ error: 'Faltan campos obligatorios' });
            return;
          }
          
          try {
            const id = await this.catalogoRepo.create(
              { tipo, descripcion, monto_defecto, es_activo: es_activo !== false }, 
              periodos_ids || []
            );
            res.status(201).json({ message: 'Cargo creado exitosamente', id });
          } catch (error) {
            console.error('Error al crear cargo:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public update = async (req: Request<{ id: string }, any, IUpdateCargoBody>, res: Response): Promise<any> => {
          const { id } = req.params;
          const { tipo, descripcion, monto_defecto, es_activo, periodos_ids } = req.body;
          
          try {
            await this.catalogoRepo.update(
              Number(id), 
              { tipo, descripcion, monto_defecto, es_activo }, 
              periodos_ids
            );
            res.json({ message: 'Cargo actualizado exitosamente' });
          } catch (error) {
            console.error('Error al actualizar cargo:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public remove = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const { id } = req.params;
          try {
            const affectedRows = await this.catalogoRepo.softDelete(Number(id));
            if (affectedRows === 0) {
              res.status(404).json({ error: 'Cargo no encontrado' });
              return;
            }
            res.json({ message: 'Cargo eliminado exitosamente' });
          } catch (error) {
            console.error('Error al eliminar cargo:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
}



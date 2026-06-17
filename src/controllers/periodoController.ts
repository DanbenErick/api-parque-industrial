import { Request, Response } from 'express';
import { PeriodoRepository } from '../repositories/periodoRepository';;

interface ICreatePeriodoBody {
  mes_anio: string;
  fecha_inicio: string | Date;
  fecha_fin: string | Date;
  estado?: string;
}

interface IUpdatePeriodoBody {
  mes_anio?: string;
  fecha_inicio?: string | Date;
  fecha_fin?: string | Date;
  estado?: string;
}

export class PeriodoController {
    constructor(private periodoRepo: PeriodoRepository) {}

    public getPeriodos = async (req: Request, res: Response): Promise<any> => {
          try {
            const periodos = await this.periodoRepo.findAll();
            res.json(periodos);
          } catch (error) {
            console.error('Error al obtener períodos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public createPeriodo = async (req: Request<{}, any, ICreatePeriodoBody>, res: Response): Promise<any> => {
          try {
            const { mes_anio } = req.body;
            
            // Verificar si ya existe
            const existing = await this.periodoRepo.findByMesAnio(mes_anio);
            if (existing) {
              return res.status(400).json({ error: 'Ya existe un periodo creado para este mes y año.' });
            }

            const insertId = await this.periodoRepo.create(req.body);
            res.status(201).json({ message: 'Período creado exitosamente', id: insertId });
          } catch (error) {
            if ((error as any).code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ error: 'El período (mes_anio) ya existe.' });
            }
            console.error('Error al crear período:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public updatePeriodo = async (req: Request<{ id: string }, any, IUpdatePeriodoBody>, res: Response): Promise<any> => {
          const { id } = req.params;

          try {
            const affectedRows = await this.periodoRepo.update(id as any, req.body);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Período no encontrado' });
            }

            res.json({ message: 'Período actualizado exitosamente' });
          } catch (error) {
            console.error('Error al actualizar período:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public deletePeriodo = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const { id } = req.params;

          try {
            const affectedRows = await this.periodoRepo.softDelete(id as any);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Período no encontrado' });
            }

            res.json({ message: 'Período eliminado exitosamente' });
          } catch (error) {
            console.error('Error al eliminar período:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
}



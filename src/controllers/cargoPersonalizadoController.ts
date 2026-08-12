import { Request, Response } from 'express';
import { CargoPersonalizadoRepository } from '../repositories/cargoPersonalizadoRepository';
import { Database } from '../config/db';

export class CargoPersonalizadoController {
  constructor(private repo: CargoPersonalizadoRepository, private db: Database) {}

  public getPendientesPorPeriodo = async (req: Request, res: Response) => {
    try {
      const { periodo_id } = req.params;
      const cargos = await this.repo.findAllPendientes(periodo_id);
      res.json(cargos);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener cargos pendientes: ' + error.message });
    }
  };

  public getPendientesPorUsuario = async (req: Request, res: Response) => {
    try {
      const { periodo_id, usuario_id } = req.params;
      const cargos = await this.repo.findPendientesPorUsuario(periodo_id, usuario_id);
      res.json(cargos);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener cargos del usuario: ' + error.message });
    }
  };

  public create = async (req: Request, res: Response) => {
    try {
      const { usuario_id, periodo_id, descripcion, monto } = req.body;
      const created_by = (req as any).user?.id || null;

      if (!usuario_id || !periodo_id || !descripcion || !monto) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      if (parseFloat(monto) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      }

      const newId = await this.repo.create({ usuario_id, periodo_id, descripcion, monto, created_by });
      res.status(201).json({ id: newId, message: 'Cargo personalizado asignado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al crear cargo personalizado: ' + error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const affected = await this.repo.softDelete(id);
      if (affected === 0) {
        return res.status(404).json({ error: 'Cargo no encontrado o ya facturado' });
      }
      res.json({ message: 'Cargo eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al eliminar el cargo: ' + error.message });
    }
  };
}

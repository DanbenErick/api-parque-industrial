import { Request, Response } from 'express';
import { MedidorRepository } from '../repositories/medidorRepository';;
import { RolUsuario } from '../types/enums';


interface ICreateMedidorBody {
  usuario_id: number;
  num_serie: string;
  tipo: string;
  operativo?: boolean;
}

interface IUpdateMedidorBody {
  usuario_id?: number;
  num_serie?: string;
  tipo?: string;
  operativo?: boolean;
}

export class MedidorController {
    constructor(private medidorRepo: MedidorRepository) {}

    public getMedidores = async (req: Request, res: Response): Promise<any> => {
          try {
            const search = req.query.search as string;
            const medidores = await this.medidorRepo.findAll(search);
            res.json(medidores);
          } catch (error) {
            console.error('Error al obtener medidores:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getMedidoresByUsuario = async (req: Request<{ usuarioId: string }>, res: Response): Promise<any> => {
          const { usuarioId } = req.params;
          
          if (req.user?.nombre_rol === RolUsuario.SOCIO && req.user.id !== parseInt(usuarioId as string)) {
            return res.status(403).json({ error: 'No tienes permisos para ver estos medidores' });
          }

          try {
            const medidores = await this.medidorRepo.findByUsuario(usuarioId);
            res.json(medidores);
          } catch (error) {
            console.error('Error al obtener medidores por usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public createMedidor = async (req: Request<{}, any, ICreateMedidorBody>, res: Response): Promise<any> => {
          try {
            const insertId = await this.medidorRepo.create(req.body);
            res.status(201).json({ message: 'Medidor creado exitosamente', id: insertId });
          } catch (error) {
            if ((error as any).code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ error: 'El número de serie ya existe.' });
            }
            console.error('Error al crear medidor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public updateMedidor = async (req: Request<{ id: string }, any, IUpdateMedidorBody>, res: Response): Promise<any> => {
          const { id } = req.params;

          try {
            const affectedRows = await this.medidorRepo.update(id, req.body);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Medidor no encontrado' });
            }

            res.json({ message: 'Medidor actualizado exitosamente' });
          } catch (error) {
            console.error('Error al actualizar medidor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public deleteMedidor = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const { id } = req.params;

          try {
            const affectedRows = await this.medidorRepo.softDelete(id);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Medidor no encontrado' });
            }

            res.json({ message: 'Medidor eliminado exitosamente' });
          } catch (error) {
            console.error('Error al eliminar medidor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
}



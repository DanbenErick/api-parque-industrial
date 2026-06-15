import { Request, Response } from 'express';
import * as medidorRepo from '../repositories/medidorRepository';

export const getMedidores = async (req: Request, res: Response): Promise<any> => {
  try {
    const medidores = await medidorRepo.findAll();
    res.json(medidores);
  } catch (error) {
    console.error('Error al obtener medidores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getMedidoresByUsuario = async (req: Request<{ usuarioId: string }>, res: Response): Promise<any> => {
  const { usuarioId } = req.params;
  
  if (req.user?.nombre_rol === 'Socio' && req.user.id !== parseInt(usuarioId as string)) {
    return res.status(403).json({ error: 'No tienes permisos para ver estos medidores' });
  }

  try {
    const medidores = await medidorRepo.findByUsuario(usuarioId);
    res.json(medidores);
  } catch (error) {
    console.error('Error al obtener medidores por usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

interface ICreateMedidorBody {
  usuario_id: number;
  num_serie: string;
  tipo: string;
  operativo?: boolean;
}

export const createMedidor = async (req: Request<{}, any, ICreateMedidorBody>, res: Response): Promise<any> => {
  try {
    const insertId = await medidorRepo.create(req.body);
    res.status(201).json({ message: 'Medidor creado exitosamente', id: insertId });
  } catch (error) {
    if ((error as any).code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El número de serie ya existe.' });
    }
    console.error('Error al crear medidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

interface IUpdateMedidorBody {
  usuario_id?: number;
  num_serie?: string;
  tipo?: string;
  operativo?: boolean;
}

export const updateMedidor = async (req: Request<{ id: string }, any, IUpdateMedidorBody>, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const affectedRows = await medidorRepo.update(id, req.body);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Medidor no encontrado' });
    }

    res.json({ message: 'Medidor actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar medidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteMedidor = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const affectedRows = await medidorRepo.softDelete(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Medidor no encontrado' });
    }

    res.json({ message: 'Medidor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar medidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



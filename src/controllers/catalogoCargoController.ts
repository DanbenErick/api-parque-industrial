import { Request, Response } from 'express';
import * as catalogoRepo from '../repositories/catalogoCargoRepository';

export const getAll = async (req: Request, res: Response): Promise<any> => {
  try {
    const cargos = await catalogoRepo.findAll();
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

export const getActivosPorPeriodo = async (req: Request, res: Response): Promise<any> => {
  const { periodo_id } = req.params;
  try {
    const cargos = await catalogoRepo.findActivosPorPeriodo(periodo_id);
    res.json(cargos);
  } catch (error) {
    console.error('Error al obtener cargos por periodo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const create = async (req: Request, res: Response): Promise<any> => {
  const { tipo, descripcion, monto_defecto, es_activo, periodos_ids } = req.body;
  if (!tipo || !descripcion || monto_defecto === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  
  try {
    const id = await catalogoRepo.create(
      { tipo, descripcion, monto_defecto, es_activo: es_activo !== false }, 
      periodos_ids || []
    );
    res.status(201).json({ message: 'Cargo creado exitosamente', id });
  } catch (error) {
    console.error('Error al crear cargo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const update = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { tipo, descripcion, monto_defecto, es_activo, periodos_ids } = req.body;
  
  try {
    await catalogoRepo.update(
      id, 
      { tipo, descripcion, monto_defecto, es_activo }, 
      periodos_ids
    );
    res.json({ message: 'Cargo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar cargo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const remove = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const affectedRows = await catalogoRepo.softDelete(id);
    if (affectedRows === 0) return res.status(404).json({ error: 'Cargo no encontrado' });
    res.json({ message: 'Cargo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cargo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



import { Request, Response } from 'express';
import * as configRepository from '../repositories/configRepository';

export const getConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const config = await configRepository.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

interface IUpdateConfigBody {
  monto_multa_base?: number;
  monto_instalacion_base?: number;
}

export const updateConfig = async (req: Request<{}, any, IUpdateConfigBody>, res: Response): Promise<any> => {
  const { monto_multa_base, monto_instalacion_base } = req.body;
  try {
    await configRepository.updateConfig(monto_multa_base || 0, monto_instalacion_base || 0);
    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

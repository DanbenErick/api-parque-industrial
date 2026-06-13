import { Request, Response } from 'express';
import db from '../config/db';

export const getConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows]: any = await db.query('SELECT * FROM configuracion LIMIT 1');
    res.json(rows[0] || { monto_multa_base: 0, monto_instalacion_base: 0 });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<any> => {
  const { monto_multa_base, monto_instalacion_base } = req.body;
  try {
    await db.query('UPDATE configuracion SET monto_multa_base = ?, monto_instalacion_base = ? WHERE id = 1', [
      monto_multa_base || 0, monto_instalacion_base || 0
    ]);
    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};



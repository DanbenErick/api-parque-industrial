import db from '../config/db';
import { IConfiguracion } from '../types';

export const getConfig = async (): Promise<IConfiguracion> => {
  const [rows]: any = await db.query('SELECT * FROM configuracion LIMIT 1');
  return rows[0] || { monto_multa_base: 0, monto_instalacion_base: 0 };
};

export const updateConfig = async (monto_multa_base: number, monto_instalacion_base: number): Promise<void> => {
  await db.query('UPDATE configuracion SET monto_multa_base = ?, monto_instalacion_base = ? WHERE id = 1', [
    monto_multa_base || 0, monto_instalacion_base || 0
  ]);
};

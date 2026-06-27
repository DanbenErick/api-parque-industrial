import { Database } from '../config/db';
import { IConfiguracion } from '../types';

export class ConfigRepository {
    constructor(private db: Database) {}
    public getConfig = async (): Promise<IConfiguracion> => {
          const [rows]: any = await this.db.query('SELECT * FROM configuracion LIMIT 1');
          return rows[0] || { monto_multa_base: 0, monto_instalacion_base: 0, cuenta_bancaria: '' };
        };
    public updateConfig = async (monto_multa_base: number, monto_instalacion_base: number, cuenta_bancaria: string): Promise<void> => {
          await this.db.query('UPDATE configuracion SET monto_multa_base = ?, monto_instalacion_base = ?, cuenta_bancaria = ? WHERE id = 1', [
            monto_multa_base || 0, monto_instalacion_base || 0, cuenta_bancaria || null
          ]);
        };
}



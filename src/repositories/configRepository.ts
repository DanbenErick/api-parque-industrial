import { Database } from '../config/db';
import { IConfiguracion } from '../types';

export class ConfigRepository {
    constructor(private db: Database) {}
    public getConfig = async (): Promise<IConfiguracion> => {
          const [rows]: any = await this.db.query('SELECT * FROM configuracion LIMIT 1');
          return rows[0] || { monto_multa_base: 0, monto_instalacion_base: 0, cuenta_bancaria: '' };
        };
    public updateConfig = async (monto_multa_base: number, monto_instalacion_base: number, cuenta_bancaria: string): Promise<void> => {
          const [rows]: any = await this.db.query('SELECT id FROM configuracion LIMIT 1');
          if (rows.length > 0) {
            await this.db.query('UPDATE configuracion SET monto_multa_base = ?, monto_instalacion_base = ?, cuenta_bancaria = ? WHERE id = ?', [
              monto_multa_base || 0, monto_instalacion_base || 0, cuenta_bancaria || null, rows[0].id
            ]);
          } else {
            await this.db.query('INSERT INTO configuracion (monto_multa_base, monto_instalacion_base, cuenta_bancaria) VALUES (?, ?, ?)', [
              monto_multa_base || 0, monto_instalacion_base || 0, cuenta_bancaria || null
            ]);
          }
        };
}



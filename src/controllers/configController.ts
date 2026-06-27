import { Request, Response } from 'express';
import { ConfigRepository } from '../repositories/configRepository';;

interface IUpdateConfigBody {
  monto_multa_base?: number;
  monto_instalacion_base?: number;
  cuenta_bancaria?: string;
}

export class ConfigController {
    constructor(private configRepository: ConfigRepository) {}

    public getConfig = async (req: Request, res: Response): Promise<any> => {
          try {
            const config = await this.configRepository.getConfig();
            res.json(config);
          } catch (error) {
            console.error('Error fetching config:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public updateConfig = async (req: Request<{}, any, IUpdateConfigBody>, res: Response): Promise<any> => {
          const { monto_multa_base, monto_instalacion_base, cuenta_bancaria } = req.body;
          try {
            await this.configRepository.updateConfig(monto_multa_base || 0, monto_instalacion_base || 0, cuenta_bancaria || '');
            res.json({ message: 'Configuración actualizada exitosamente' });
          } catch (error) {
            console.error('Error updating config:', error);
            res.status(500).json({ error: 'Error al actualizar configuración' });
          }
        };
}



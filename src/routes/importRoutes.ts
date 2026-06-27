import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../middlewares/auth';
import { ImportBulkService } from '../services/importBulkService';
import { RolUsuario } from '../types/enums';

export class ImportRoutes {
    public router: Router;

    constructor(private importBulkService: ImportBulkService, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);

        // Solo Admin puede importar
        this.router.post(
            '/facturacion-masiva',
            this.authMiddleware.authorizeRole([RolUsuario.ADMIN]),
            this.importarFacturacion
        );
    }

    private importarFacturacion = async (req: Request, res: Response): Promise<any> => {
        try {
            const rows = req.body;

            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(400).json({ error: 'Se requiere un array de filas para importar' });
            }

            if (rows.length > 2000) {
                return res.status(400).json({ error: 'El máximo de filas permitido es 2000' });
            }

            const admin_id = req.user.id;
            const result = await this.importBulkService.importarFacturacionMasiva(rows, admin_id);

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error en importación masiva:', error);
            return res.status(500).json({ error: error.message || 'Error interno del servidor' });
        }
    };

    public getRouter(): Router {
        return this.router;
    }
}

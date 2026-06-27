import { Router } from 'express';
import { PeriodoController } from '../controllers/periodoController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class PeriodoRoutes {
    public router: Router;

    constructor(private periodoController: PeriodoController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        // Admin only routes
        this.router.post('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.periodoController.createPeriodo);
        this.router.put('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.periodoController.updatePeriodo);
        this.router.delete('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.periodoController.deletePeriodo);
        
        // Admin and Operario can read periods
        this.router.get('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.periodoController.getPeriodos);
        
        // Stats
        this.router.get('/:mes_anio/stats', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.periodoController.getStats);
    }

    public getRouter(): Router {
        return this.router;
    }
}

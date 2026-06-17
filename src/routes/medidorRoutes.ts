import { Router } from 'express';
import { MedidorController } from '../controllers/medidorController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class MedidorRoutes {
    public router: Router;

    constructor(private medidorController: MedidorController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        // Socios can only view their own meters
        this.router.get('/usuario/:usuarioId', this.medidorController.getMedidoresByUsuario);
        
        // Admin and Operario can view all meters
        this.router.get('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.medidorController.getMedidores);
        
        // Only Admin can create, update, delete meters
        this.router.post('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.medidorController.createMedidor);
        this.router.put('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.medidorController.updateMedidor);
        this.router.delete('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.medidorController.deleteMedidor);
    }

    public getRouter(): Router {
        return this.router;
    }
}

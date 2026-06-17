import { Router } from 'express';
import { ConfigController } from '../controllers/configController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class ConfigRoutes {
    public router: Router;

    constructor(private configController: ConfigController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        this.router.get('/', this.configController.getConfig);
        this.router.put('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.configController.updateConfig);
    }

    public getRouter(): Router {
        return this.router;
    }
}

import { Router } from 'express';
import { CatalogoCargoController } from '../controllers/catalogoCargoController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class CatalogoCargoRoutes {
    public router: Router;

    constructor(private catalogoCargoController: CatalogoCargoController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        this.router.get('/', this.catalogoCargoController.getAll);
        this.router.get('/periodo/:periodo_id', this.catalogoCargoController.getActivosPorPeriodo);
        this.router.post('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.catalogoCargoController.create);
        this.router.put('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.catalogoCargoController.update);
        this.router.delete('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.catalogoCargoController.remove);
    }

    public getRouter(): Router {
        return this.router;
    }
}

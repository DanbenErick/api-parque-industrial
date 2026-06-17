import { Router } from 'express';
import { LecturaController } from '../controllers/lecturaController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class LecturaRoutes {
    public router: Router;

    constructor(private lecturaController: LecturaController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        this.router.get('/socios/autocomplete', this.lecturaController.getSociosAutocomplete);
        
        // Socios can only see their own readings
        this.router.get('/usuario/:usuarioId', this.lecturaController.getLecturasByUsuario);
        
        // Admin and Operario can read all readings
        this.router.get('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.lecturaController.getLecturas);
        
        this.router.get('/ultimas', this.lecturaController.getUltimasLecturas);
        
        // Admin and Operario can create readings
        this.router.post('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.lecturaController.createLectura);
        
        // Only Admin can update or delete readings
        this.router.put('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.lecturaController.updateLectura);
        this.router.delete('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.lecturaController.deleteLectura);
    }

    public getRouter(): Router {
        return this.router;
    }
}

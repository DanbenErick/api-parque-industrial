import { Router } from 'express';
import { UsuarioController } from '../controllers/usuarioController';
import { AuthMiddleware } from '../middlewares/auth';
import { ValidatorsMiddleware } from '../middlewares/validators';
import { RolUsuario } from '../types/enums';


export class UsuarioRoutes {
    public router: Router;

    constructor(private usuarioController: UsuarioController, private authMiddleware: AuthMiddleware, private validatorsMiddleware: ValidatorsMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // All user routes require authentication
        this.router.use(this.authMiddleware.authenticateToken);
        // Permitimos a Admin y Operario gestionar usuarios (el operario necesita ver y registrar)
        this.router.use(this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]));
        
        this.router.get('/stats', this.usuarioController.getUsuariosStats);
        this.router.get('/', this.usuarioController.getUsuarios);
        this.router.get('/export/excel', this.usuarioController.exportExcel);
        this.router.get('/export/pdf', this.usuarioController.exportPdf);
        this.router.post('/', this.validatorsMiddleware.createUsuarioValidator, this.usuarioController.createUsuario);
        this.router.put('/:id', this.validatorsMiddleware.updateUsuarioValidator, this.usuarioController.updateUsuario);
        this.router.delete('/:id', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.usuarioController.deleteUsuario);
    }

    public getRouter(): Router {
        return this.router;
    }
}

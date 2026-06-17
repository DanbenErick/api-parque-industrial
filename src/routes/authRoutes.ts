import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthMiddleware } from '../middlewares/auth';
import { ValidatorsMiddleware } from '../middlewares/validators';
import { RolUsuario } from '../types/enums';


export class AuthRoutes {
    public router: Router;

    constructor(private authController: AuthController, private authMiddleware: AuthMiddleware, private validatorsMiddleware: ValidatorsMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Public routes
        this.router.post('/login', this.validatorsMiddleware.loginValidator, this.authController.login);
        
        // Protected routes
        this.router.get('/profile', this.authMiddleware.authenticateToken, this.authController.getProfile);
        this.router.get('/me', this.authMiddleware.authenticateToken, this.authController.getProfile);
        this.router.put('/change-password', this.authMiddleware.authenticateToken, this.authController.changePassword);
        this.router.get('/sesiones', this.authMiddleware.authenticateToken, this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.authController.getSesiones);
    }

    public getRouter(): Router {
        return this.router;
    }
}

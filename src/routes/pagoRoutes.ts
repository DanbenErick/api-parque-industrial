import { Router } from 'express';
import { PagoController } from '../controllers/pagoController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class PagoRoutes {
    public router: Router;

    constructor(private pagoController: PagoController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        // Admin can see all payments
        this.router.get('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.pagoController.getPagos);
        this.router.get('/reporte/pdf', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.pagoController.exportReportePdf);
        this.router.get('/reporte/excel', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.pagoController.exportResumenPagosExcel);
        
        // Socios can register a payment (uploading a proof basically, or admin manually)
        // In a real app, member uploading would make it 'Pendiente' and Admin confirms.
        // Here we allow Admin or Socio to post. Let's restrict to Admin/Socio.
        this.router.post('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.SOCIO]), this.pagoController.registrarPago);
    }

    public getRouter(): Router {
        return this.router;
    }
}

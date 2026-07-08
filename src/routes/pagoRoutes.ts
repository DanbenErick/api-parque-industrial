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
        
        // Admin and Operario can see all payments
        this.router.get('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.pagoController.getPagos);
        this.router.get('/export/all', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.pagoController.exportAllTicketsPdf);
        this.router.get('/reporte/pdf', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.pagoController.exportReportePdf);
        this.router.get('/reporte/excel', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.pagoController.exportResumenPagosExcel);
        
        // Socios can see their own payments
        this.router.get('/usuario/:usuarioId', this.pagoController.getPagosByUsuario);

        // Socios can register a payment (uploading a proof basically, or admin/operario manually)
        // In a real app, member uploading would make it 'Pendiente' and Admin confirms.
        // Here we allow Admin, Operario or Socio to post.
        this.router.post('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO, RolUsuario.SOCIO]), this.pagoController.registrarPago);

        // Acciones Rápidas (Anular y Ticket)
        this.router.get('/:id/ticket', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO, RolUsuario.SOCIO]), this.pagoController.exportTicketPdf);
        this.router.post('/:id/anular', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.pagoController.anularPago);
    }

    public getRouter(): Router {
        return this.router;
    }
}

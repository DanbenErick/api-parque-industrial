import { Router } from 'express';
import { ReciboController } from '../controllers/reciboController';
import { AuthMiddleware } from '../middlewares/auth';
import { RolUsuario } from '../types/enums';


export class ReciboRoutes {
    public router: Router;

    constructor(private reciboController: ReciboController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        // Socios can only see their own receipts
        this.router.get('/usuario/:usuarioId', this.reciboController.getRecibosByUsuario);
        
        // Export all receipts as PDF
        this.router.get('/export/all', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.exportAllRecibosPdfV2);
        
        // Export all receipts as Excel and PDF
        this.router.get('/reporte/pdf', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.exportReportePdf);
        this.router.get('/reporte/excel', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.exportReporteExcel);
        this.router.get('/reportes/deudas/excel', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.exportReporteDeudasExcel);
        
        // Export single receipt as PDF
        this.router.get('/:id/pdf', this.reciboController.exportReciboPdf);
        // Get global stats for KPIs
        this.router.get('/stats/global', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.getRecibosStats);
        
        // Get single receipt details
        this.router.get('/:id', this.reciboController.getReciboById);
        
        // Admin and Operario can read all receipts
        this.router.get('/', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.getRecibos);
        
        // Only Admin can trigger bulk generation
        this.router.post('/generar', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.reciboController.generarRecibos);
        
        // Generar factura para un solo usuario
        this.router.post('/generar/individual', this.authMiddleware.authorizeRole([RolUsuario.ADMIN]), this.reciboController.generarReciboIndividual);
        
        // Refacturar (Anular y regenerar) recibo
        this.router.post('/:id/refacturar', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.refacturarRecibo);
        
        // Edit receipt fees
        this.router.put('/:id/cargos', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.updateCargos);
        
        // Historial de refacturaciones
        this.router.get('/:id/historial', this.authMiddleware.authorizeRole([RolUsuario.ADMIN, RolUsuario.OPERARIO]), this.reciboController.getHistorial);
    }

    public getRouter(): Router {
        return this.router;
    }
}

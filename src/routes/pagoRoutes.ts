import { Router } from 'express';
import * as pagoController from '../controllers/pagoController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router: Router = Router();

router.use(authenticateToken);

// Admin can see all payments
router.get('/', authorizeRole(['Admin']), pagoController.getPagos);
router.get('/reporte/pdf', authorizeRole(['Admin', 'Operario']), pagoController.exportReportePdf);
router.get('/reporte/excel', authorizeRole(['Admin', 'Operario']), pagoController.exportResumenPagosExcel);

// Socios can register a payment (uploading a proof basically, or admin manually)
// In a real app, member uploading would make it 'Pendiente' and Admin confirms.
// Here we allow Admin or Socio to post. Let's restrict to Admin/Socio.
router.post('/', authorizeRole(['Admin', 'Socio']), pagoController.registrarPago);

export default router;

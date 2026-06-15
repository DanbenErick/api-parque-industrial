import { Router } from 'express';
import * as reciboController from '../controllers/reciboController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router: Router = Router();

router.use(authenticateToken);

// Socios can only see their own receipts
router.get('/usuario/:usuarioId', reciboController.getRecibosByUsuario);

// Export all receipts as PDF V2
router.get('/export/all-v2', authorizeRole(['Admin', 'Operario']), reciboController.exportAllRecibosPdfV2);

// Export all receipts as Excel and PDF
router.get('/reporte/pdf', authorizeRole(['Admin', 'Operario']), reciboController.exportReportePdf);
router.get('/reporte/excel', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteExcel);
router.get('/reportes/deudas/excel', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteDeudasExcel);

// Export single receipt as PDF
router.get('/:id/pdf', reciboController.exportReciboPdf);

// Export single receipt as PDF V2 (Rediseñado)
router.get('/:id/pdf-v2', reciboController.exportReciboPdfV2);

// Export single receipt as PDF V3 (Premium)
router.get('/:id/pdf-v3', reciboController.exportReciboPdfV3);



// Get global stats for KPIs
router.get('/stats/global', authorizeRole(['Admin', 'Operario']), reciboController.getRecibosStats);

// Get single receipt details
router.get('/:id', reciboController.getReciboById);

// Admin and Operario can read all receipts
router.get('/', authorizeRole(['Admin', 'Operario']), reciboController.getRecibos);

// Only Admin can trigger bulk generation
router.post('/generar', authorizeRole(['Admin']), reciboController.generarRecibos);

// Generar factura para un solo usuario
router.post('/generar/individual', authorizeRole(['Admin']), reciboController.generarReciboIndividual);

// Refacturar (Anular y regenerar) recibo
router.post('/:id/refacturar', authorizeRole(['Admin', 'Operario']), reciboController.refacturarRecibo);

// Edit receipt fees
router.put('/:id/cargos', authorizeRole(['Admin', 'Operario']), reciboController.updateCargos);

export default router;

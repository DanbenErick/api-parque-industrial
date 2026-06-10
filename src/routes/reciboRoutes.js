const express = require('express');
const router = express.Router();
const reciboController = require('../controllers/reciboController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

router.use(authenticateToken);

// Socios can only see their own receipts
router.get('/usuario/:usuarioId', reciboController.getRecibosByUsuario);

// Export all receipts as PDF V2
router.get('/export/all-v2', reciboController.exportAllRecibosPdfV2);

// Export single receipt as PDF
router.get('/:id/pdf', reciboController.exportReciboPdf);

// Export single receipt as PDF V2 (Rediseñado)
router.get('/:id/pdf-v2', reciboController.exportReciboPdfV2);

// Export single receipt as PDF V3 (Premium)
router.get('/:id/pdf-v3', reciboController.exportReciboPdfV3);

// Export all receipts as Excel
router.get('/reporte/excel', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteExcel);
router.get('/reportes/deudas/excel', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteDeudasExcel);

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

module.exports = router;

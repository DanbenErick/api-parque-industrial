const express = require('express');
const router = express.Router();
const medidorController = require('../controllers/medidorController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

router.use(authenticateToken);

// Socios can only view their own meters
router.get('/usuario/:usuarioId', medidorController.getMedidoresByUsuario);

// Admin and Operario can view all meters
router.get('/', authorizeRole(['Admin', 'Operario']), medidorController.getMedidores);

// Only Admin can create, update, delete meters
router.post('/', authorizeRole(['Admin']), medidorController.createMedidor);
router.put('/:id', authorizeRole(['Admin']), medidorController.updateMedidor);
router.delete('/:id', authorizeRole(['Admin']), medidorController.deleteMedidor);

module.exports = router;

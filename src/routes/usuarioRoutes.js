const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// All user routes require authentication
router.use(authenticateToken);
// Permitimos a Admin y Operario gestionar usuarios (el operario necesita ver y registrar)
router.use(authorizeRole(['Admin', 'Operario']));

router.get('/stats', usuarioController.getUsuariosStats);
router.get('/', usuarioController.getUsuarios);
router.get('/export/excel', usuarioController.exportExcel);
router.get('/export/pdf', usuarioController.exportPdf);
router.post('/', usuarioController.createUsuario);
router.put('/:id', usuarioController.updateUsuario);
router.delete('/:id', authorizeRole(['Admin']), usuarioController.deleteUsuario);

module.exports = router;

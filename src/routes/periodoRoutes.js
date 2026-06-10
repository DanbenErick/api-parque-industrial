const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodoController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

router.use(authenticateToken);

// Admin only routes
router.post('/', authorizeRole(['Admin']), periodoController.createPeriodo);
router.put('/:id', authorizeRole(['Admin']), periodoController.updatePeriodo);
router.delete('/:id', authorizeRole(['Admin']), periodoController.deletePeriodo);

// Admin and Operario can read periods
router.get('/', authorizeRole(['Admin', 'Operario']), periodoController.getPeriodos);

module.exports = router;

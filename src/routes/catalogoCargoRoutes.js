const express = require('express');
const router = express.Router();
const catalogoCargoController = require('../controllers/catalogoCargoController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', catalogoCargoController.getAll);
router.get('/periodo/:periodo_id', catalogoCargoController.getActivosPorPeriodo);
router.post('/', catalogoCargoController.create);
router.put('/:id', catalogoCargoController.update);
router.delete('/:id', catalogoCargoController.remove);

module.exports = router;

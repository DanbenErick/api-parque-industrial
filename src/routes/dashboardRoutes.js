const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/kpis', dashboardController.getKpis);
router.get('/chart', dashboardController.getChart);
router.get('/alerts', dashboardController.getAlerts);

module.exports = router;

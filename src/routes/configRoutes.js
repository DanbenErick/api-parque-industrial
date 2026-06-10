const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', configController.getConfig);
router.put('/', authorizeRole(['Admin']), configController.updateConfig);

module.exports = router;

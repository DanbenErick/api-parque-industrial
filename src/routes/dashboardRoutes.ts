import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateToken } from '../middlewares/auth';

const router: Router = Router();

router.use(authenticateToken);

router.get('/kpis', dashboardController.getKpis);
router.get('/chart', dashboardController.getChart);
router.get('/alerts', dashboardController.getAlerts);

export default router;

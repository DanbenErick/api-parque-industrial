import { Router } from 'express';
import * as configController from '../controllers/configController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router: Router = Router();

router.use(authenticateToken);

router.get('/', configController.getConfig);
router.put('/', authorizeRole(['Admin']), configController.updateConfig);

export default router;

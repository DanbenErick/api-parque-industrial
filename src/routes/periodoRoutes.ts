import { Router } from 'express';
import * as periodoController from '../controllers/periodoController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Admin only routes
router.post('/', authorizeRole(['Admin']), periodoController.createPeriodo);
router.put('/:id', authorizeRole(['Admin']), periodoController.updatePeriodo);
router.delete('/:id', authorizeRole(['Admin']), periodoController.deletePeriodo);

// Admin and Operario can read periods
router.get('/', authorizeRole(['Admin', 'Operario']), periodoController.getPeriodos);

export default router;

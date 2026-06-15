import { Router } from 'express';
import * as catalogoCargoController from '../controllers/catalogoCargoController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router: Router = Router();

router.use(authenticateToken);

router.get('/', catalogoCargoController.getAll);
router.get('/periodo/:periodo_id', catalogoCargoController.getActivosPorPeriodo);
router.post('/', authorizeRole(['Admin']), catalogoCargoController.create);
router.put('/:id', authorizeRole(['Admin']), catalogoCargoController.update);
router.delete('/:id', authorizeRole(['Admin']), catalogoCargoController.remove);

export default router;

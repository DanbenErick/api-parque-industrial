import { Router } from 'express';
import * as medidorController from '../controllers/medidorController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router: Router = Router();

router.use(authenticateToken);

// Socios can only view their own meters
router.get('/usuario/:usuarioId', medidorController.getMedidoresByUsuario);

// Admin and Operario can view all meters
router.get('/', authorizeRole(['Admin', 'Operario']), medidorController.getMedidores);

// Only Admin can create, update, delete meters
router.post('/', authorizeRole(['Admin']), medidorController.createMedidor);
router.put('/:id', authorizeRole(['Admin']), medidorController.updateMedidor);
router.delete('/:id', authorizeRole(['Admin']), medidorController.deleteMedidor);

export default router;

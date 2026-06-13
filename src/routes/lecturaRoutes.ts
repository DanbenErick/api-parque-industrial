import { Router } from 'express';
import * as lecturaController from '../controllers/lecturaController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/socios/autocomplete', lecturaController.getSociosAutocomplete);

// Socios can only see their own readings
router.get('/usuario/:usuarioId', lecturaController.getLecturasByUsuario);

// Admin and Operario can read all readings
router.get('/', authorizeRole(['Admin', 'Operario']), lecturaController.getLecturas);

router.get('/ultimas', lecturaController.getUltimasLecturas);

// Admin and Operario can create readings
router.post('/', authorizeRole(['Admin', 'Operario']), lecturaController.createLectura);

// Only Admin can update or delete readings
router.put('/:id', authorizeRole(['Admin']), lecturaController.updateLectura);
router.delete('/:id', authorizeRole(['Admin']), lecturaController.deleteLectura);

export default router;

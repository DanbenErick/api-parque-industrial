import { Router } from 'express';
import * as usuarioController from '../controllers/usuarioController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';
import { createUsuarioValidator, updateUsuarioValidator } from '../middlewares/validators';

const router: Router = Router();

// All user routes require authentication
router.use(authenticateToken);
// Permitimos a Admin y Operario gestionar usuarios (el operario necesita ver y registrar)
router.use(authorizeRole(['Admin', 'Operario']));

router.get('/stats', usuarioController.getUsuariosStats);
router.get('/', usuarioController.getUsuarios);
router.get('/export/excel', usuarioController.exportExcel);
router.get('/export/pdf', usuarioController.exportPdf);
router.post('/', createUsuarioValidator, usuarioController.createUsuario);
router.put('/:id', updateUsuarioValidator, usuarioController.updateUsuario);
router.delete('/:id', authorizeRole(['Admin']), usuarioController.deleteUsuario);

export default router;

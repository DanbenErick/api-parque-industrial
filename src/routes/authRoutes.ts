import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken, authorizeRole } from '../middlewares/auth';
import { loginValidator } from '../middlewares/validators';

const router: Router = Router();

// Public routes
router.post('/login', loginValidator, authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/change-password', authenticateToken, authController.changePassword);
router.get('/sesiones', authenticateToken, authorizeRole(['Admin']), authController.getSesiones);

export default router;

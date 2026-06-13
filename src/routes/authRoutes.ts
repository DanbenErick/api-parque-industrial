import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { loginValidator } from '../middlewares/validators';

const router = Router();

// Public routes
router.post('/login', loginValidator, authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

export default router;

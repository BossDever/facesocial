// backend/src/api/routes/auth.routes.ts
import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับการยืนยันตัวตน
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login-face', authController.loginWithFace);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.patch('/profile', authenticate, authController.updateUserProfile);
router.post('/face-data/:userId', authenticate, authController.storeFaceData);
router.get('/status', authController.getApiStatus);

export default router;
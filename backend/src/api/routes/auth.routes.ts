// backend/src/api/routes/auth.routes.ts
import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// แยกฟังก์ชันที่จัดการ async error ออกมา
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// เส้นทาง API สำหรับการยืนยันตัวตน
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/login-face', asyncHandler(authController.loginWithFace));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));
router.patch('/profile', authenticate, asyncHandler(authController.updateUserProfile));
router.post('/face-data/:userId', authenticate, asyncHandler(authController.storeFaceData));
router.get('/status', asyncHandler(authController.getApiStatus));

export default router;
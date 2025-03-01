// backend/src/api/routes/auth.routes.ts
import express, { Request, Response } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับการยืนยันตัวตน
router.post('/register', (req: Request, res: Response) => authController.register(req, res));
router.post('/login', (req: Request, res: Response) => authController.login(req, res));
router.post('/login-face', (req: Request, res: Response) => authController.loginWithFace(req, res));
router.post('/logout', authenticate, (req: Request, res: Response) => authController.logout(req, res));
router.get('/me', authenticate, (req: Request, res: Response) => authController.getCurrentUser(req, res));
router.patch('/profile', authenticate, (req: Request, res: Response) => authController.updateUserProfile(req, res));
router.post('/face-data/:userId', authenticate, (req: Request, res: Response) => authController.storeFaceData(req, res));
router.get('/status', (req: Request, res: Response) => authController.getApiStatus(req, res));

export default router;

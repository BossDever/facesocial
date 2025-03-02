// backend/src/api/routes/auth.routes.ts
import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับการยืนยันตัวตน
router.post('/register', (req, res, next) => {
  authController.register(req, res).catch(next);
});

router.post('/login', (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post('/login-face', (req, res, next) => {
  authController.loginWithFace(req, res).catch(next);
});

router.post('/logout', authenticate, (req, res, next) => {
  authController.logout(req, res).catch(next);
});

router.get('/me', authenticate, (req, res, next) => {
  authController.getCurrentUser(req, res).catch(next);
});

router.patch('/profile', authenticate, (req, res, next) => {
  authController.updateUserProfile(req, res).catch(next);
});

router.post('/face-data/:userId', authenticate, (req, res, next) => {
  authController.storeFaceData(req, res).catch(next);
});

router.get('/status', (req, res, next) => {
  authController.getApiStatus(req, res).catch(next);
});

export default router;
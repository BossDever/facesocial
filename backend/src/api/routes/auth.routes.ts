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

// เพิ่ม endpoint ใหม่: ตรวจสอบชื่อผู้ใช้ซ้ำ
router.get('/check-username', (req, res, next) => {
  authController.checkUsername(req, res).catch(next);
});

// เพิ่ม endpoint ใหม่: ตรวจสอบอีเมลซ้ำ
router.get('/check-email', (req, res, next) => {
  authController.checkEmail(req, res).catch(next);
});

export default router;
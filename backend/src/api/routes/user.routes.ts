// backend/src/api/routes/user.routes.ts
import express from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการผู้ใช้
router.get('/:id', (req, res, next) => {
  userController.getUserById(req, res).catch(next);
});

router.get('/:id/faces', authenticate, (req, res, next) => {
  userController.getUserFaces(req, res).catch(next);
});

router.get('/:id/posts', (req, res, next) => {
  userController.getUserPosts(req, res).catch(next);
});

router.get('/:id/access-logs', authenticate, (req, res, next) => {
  userController.getUserAccessLogs(req, res).catch(next);
});

router.post('/:id/follow', authenticate, (req, res, next) => {
  userController.followUser(req, res).catch(next);
});

router.delete('/:id/follow', authenticate, (req, res, next) => {
  userController.unfollowUser(req, res).catch(next);
});

export default router;
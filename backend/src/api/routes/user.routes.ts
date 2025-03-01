import express from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการผู้ใช้
router.get('/:id', userController.getUserById);
router.get('/:id/faces', authenticate, userController.getUserFaces);
router.get('/:id/posts', userController.getUserPosts);
router.get('/:id/access-logs', authenticate, userController.getUserAccessLogs);
router.post('/:id/follow', authenticate, userController.followUser);
router.delete('/:id/follow', authenticate, userController.unfollowUser);

export default router;
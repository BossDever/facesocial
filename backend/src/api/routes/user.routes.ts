// backend/src/api/routes/user.routes.ts
import express from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการผู้ใช้
router.get('/:id', (req, res) => userController.getUserById(req, res));
router.get('/:id/faces', authenticate, (req, res) => userController.getUserFaces(req, res));
router.get('/:id/posts', (req, res) => userController.getUserPosts(req, res));
router.get('/:id/access-logs', authenticate, (req, res) => userController.getUserAccessLogs(req, res));
router.post('/:id/follow', authenticate, (req, res) => userController.followUser(req, res));
router.delete('/:id/follow', authenticate, (req, res) => userController.unfollowUser(req, res));

export default router;
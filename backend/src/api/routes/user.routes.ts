// backend/src/api/routes/user.routes.ts
import express, { Request, Response } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการผู้ใช้
router.get('/:id', (req: Request, res: Response) => userController.getUserById(req, res));
router.get('/:id/faces', authenticate, (req: Request, res: Response) => userController.getUserFaces(req, res));
router.get('/:id/posts', (req: Request, res: Response) => userController.getUserPosts(req, res));
router.get('/:id/access-logs', authenticate, (req: Request, res: Response) => userController.getUserAccessLogs(req, res));
router.post('/:id/follow', authenticate, (req: Request, res: Response) => userController.followUser(req, res));
router.delete('/:id/follow', authenticate, (req: Request, res: Response) => userController.unfollowUser(req, res));

export default router;

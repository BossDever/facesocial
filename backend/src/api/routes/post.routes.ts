// backend/src/api/routes/post.routes.ts
import express, { Request, Response } from 'express';
import * as postController from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการโพสต์
router.get('/', (req: Request, res: Response) => postController.getAllPosts(req, res));
router.get('/:id', (req: Request, res: Response) => postController.getPostById(req, res));
router.post('/', authenticate, (req: Request, res: Response) => postController.createPost(req, res));
router.delete('/:id', authenticate, (req: Request, res: Response) => postController.deletePost(req, res));

// เส้นทางสำหรับไลค์และความคิดเห็น
router.post('/:id/like', authenticate, (req: Request, res: Response) => postController.likePost(req, res));
router.delete('/:id/like', authenticate, (req: Request, res: Response) => postController.unlikePost(req, res));
router.post('/:id/comment', authenticate, (req: Request, res: Response) => postController.commentPost(req, res));
router.delete('/:id/comment/:commentId', authenticate, (req: Request, res: Response) => postController.deleteComment(req, res));

export default router;

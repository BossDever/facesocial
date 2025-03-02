// backend/src/api/routes/post.routes.ts
import express from 'express';
import * as postController from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการโพสต์
router.get('/', postController.getAllPosts);
router.get('/:id', postController.getPostById);
router.post('/', authenticate, postController.createPost);
router.delete('/:id', authenticate, postController.deletePost);

// เส้นทางสำหรับไลค์และความคิดเห็น
router.post('/:id/like', authenticate, postController.likePost);
router.delete('/:id/like', authenticate, postController.unlikePost);
router.post('/:id/comment', authenticate, postController.commentPost);
router.delete('/:id/comment/:commentId', authenticate, postController.deleteComment);

export default router;
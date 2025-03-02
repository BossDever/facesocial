// backend/src/api/routes/post.routes.ts
import express from 'express';
import * as postController from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการโพสต์
router.get('/', (req, res) => postController.getAllPosts(req, res));
router.get('/:id', (req, res) => postController.getPostById(req, res));
router.post('/', authenticate, (req, res) => postController.createPost(req, res));
router.delete('/:id', authenticate, (req, res) => postController.deletePost(req, res));

// เส้นทางสำหรับไลค์และความคิดเห็น
router.post('/:id/like', authenticate, (req, res) => postController.likePost(req, res));
router.delete('/:id/like', authenticate, (req, res) => postController.unlikePost(req, res));
router.post('/:id/comment', authenticate, (req, res) => postController.commentPost(req, res));
router.delete('/:id/comment/:commentId', authenticate, (req, res) => postController.deleteComment(req, res));

export default router;
// backend/src/api/routes/post.routes.ts
import express from 'express';
import * as postController from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทาง API สำหรับจัดการโพสต์
router.get('/', (req, res, next) => {
  postController.getAllPosts(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  postController.getPostById(req, res).catch(next);
});

router.post('/', authenticate, (req, res, next) => {
  postController.createPost(req, res).catch(next);
});

router.delete('/:id', authenticate, (req, res, next) => {
  postController.deletePost(req, res).catch(next);
});

// เส้นทางสำหรับไลค์และความคิดเห็น
router.post('/:id/like', authenticate, (req, res, next) => {
  postController.likePost(req, res).catch(next);
});

router.delete('/:id/like', authenticate, (req, res, next) => {
  postController.unlikePost(req, res).catch(next);
});

router.post('/:id/comment', authenticate, (req, res, next) => {
  postController.commentPost(req, res).catch(next);
});

router.delete('/:id/comment/:commentId', authenticate, (req, res, next) => {
  postController.deleteComment(req, res).catch(next);
});

export default router;
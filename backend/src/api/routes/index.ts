// backend/src/api/routes/index.ts
import express from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import postRoutes from './post.routes';
import uploadRoutes from './upload.routes';
import faceRoutes from './face.routes';  // เพิ่มบรรทัดนี้

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/uploads', uploadRoutes);
router.use('/face', faceRoutes);  // เพิ่มบรรทัดนี้

export default router;
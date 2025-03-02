// backend/src/api/routes/upload.routes.ts
import express from 'express';
import * as uploadController from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadSingleFile, uploadMultipleFiles } from '../middleware/upload.middleware';

const router = express.Router();

// เส้นทาง API สำหรับอัปโหลดไฟล์
router.post('/files', authenticate, uploadMultipleFiles(), (req, res, next) => {
  uploadController.uploadFiles(req, res).catch(next);
});

router.post('/profile-image', authenticate, uploadSingleFile('image'), (req, res, next) => {
  uploadController.uploadProfileImage(req, res).catch(next);
});

router.post('/post-media', authenticate, uploadMultipleFiles('files'), (req, res, next) => {
  uploadController.uploadPostMedia(req, res).catch(next);
});

export default router;
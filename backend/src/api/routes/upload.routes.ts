import express from 'express';
import * as uploadController from '../controllers/upload.controller';
import { uploadSingleFile, uploadMultipleFiles } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// เส้นทางสำหรับการอัปโหลดไฟล์
router.post('/files', authenticate, uploadMultipleFiles('files', 10), uploadController.uploadFiles);
router.post('/profile-image', authenticate, uploadSingleFile('file'), uploadController.uploadProfileImage);
router.post('/post-media', authenticate, uploadMultipleFiles('files', 10), uploadController.uploadPostMedia);

export default router;
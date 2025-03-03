// backend/src/api/routes/face.routes.ts
import express from 'express';
import * as faceController from '../controllers/face.controller';

const router = express.Router();

// เส้นทาง API สำหรับการจัดการใบหน้า
router.get('/health', (req, res, next) => {
  faceController.checkHealth(req, res).catch(next);
});

router.post('/embeddings', (req, res, next) => {
  faceController.createEmbeddings(req, res).catch(next);
});

router.post('/detect', (req, res, next) => {
  faceController.detectFaces(req, res).catch(next);
});

router.post('/compare', (req, res, next) => {
  faceController.compareFaces(req, res).catch(next);
});

export default router;
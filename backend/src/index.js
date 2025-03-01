// backend/src/index.js - เป็นทางเลือกให้ใช้ JavaScript หากยังแก้ TypeScript ไม่ได้
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// โหลด environment variables จากไฟล์ .env
dotenv.config();

// สร้าง Express app
const app = express();

// สร้าง Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');
    return true;
  } catch (error) {
    console.error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// สร้างโฟลเดอร์สำหรับเก็บไฟล์อัปโหลด
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('สร้างโฟลเดอร์ uploads สำเร็จ');
}
app.use('/uploads', express.static(uploadsDir));

// ตั้งค่า routes พื้นฐาน
// ในโค้ด JavaScript นี้ เราจะใช้ controllers โดยตรงเพื่อลดข้อผิดพลาดกับ TypeScript

const authController = require('./api/controllers/auth.controller');
const userController = require('./api/controllers/user.controller');
const postController = require('./api/controllers/post.controller');
const authMiddleware = require('./api/middleware/auth.middleware');

// Auth routes
const authRouter = express.Router();
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/login-face', authController.loginWithFace);
authRouter.post('/logout', authMiddleware.authenticate, authController.logout);
authRouter.get('/me', authMiddleware.authenticate, authController.getCurrentUser);
authRouter.patch('/profile', authMiddleware.authenticate, authController.updateUserProfile);
authRouter.post('/face-data/:userId', authMiddleware.authenticate, authController.storeFaceData);
authRouter.get('/status', authController.getApiStatus);

// User routes
const userRouter = express.Router();
userRouter.get('/:id', userController.getUserById);
userRouter.get('/:id/faces', authMiddleware.authenticate, userController.getUserFaces);
userRouter.get('/:id/posts', userController.getUserPosts);
userRouter.get('/:id/access-logs', authMiddleware.authenticate, userController.getUserAccessLogs);
userRouter.post('/:id/follow', authMiddleware.authenticate, userController.followUser);
userRouter.delete('/:id/follow', authMiddleware.authenticate, userController.unfollowUser);

// Post routes
const postRouter = express.Router();
postRouter.get('/', postController.getAllPosts);
postRouter.get('/:id', postController.getPostById);
postRouter.post('/', authMiddleware.authenticate, postController.createPost);
postRouter.delete('/:id', authMiddleware.authenticate, postController.deletePost);
postRouter.post('/:id/like', authMiddleware.authenticate, postController.likePost);
postRouter.delete('/:id/like', authMiddleware.authenticate, postController.unlikePost);
postRouter.post('/:id/comment', authMiddleware.authenticate, postController.commentPost);
postRouter.delete('/:id/comment/:commentId', authMiddleware.authenticate, postController.deleteComment);

// กำหนด routes ให้ app
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);

// Health check route
app.get('/api/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  
  res.status(200).json({ 
    status: 'ok',
    message: 'FaceSocial API is running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// จัดการ route ที่ไม่มี
app.use((req, res) => {
  res.status(404).json({
    message: 'API endpoint ไม่พบ',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  checkDatabaseConnection();
  console.log(`API health check: http://localhost:${PORT}/api/health`);
});

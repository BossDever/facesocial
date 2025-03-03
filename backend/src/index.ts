// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import apiRoutes from './api/routes';
import path from 'path';

// โหลดค่าจากไฟล์ .env
dotenv.config();

// สร้าง Express app
const app = express();

// สร้าง Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  // แก้ไข origin เพื่อรองรับ Ngrok
  origin: [...(process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']), 
          /\.ngrok\.io$/, /\.ngrok-free\.app$/],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// สร้างโฟลเดอร์สำหรับเก็บไฟล์อัปโหลด
const uploadsDir = path.join(__dirname, '../uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
  console.log('สร้างโฟลเดอร์ uploads สำเร็จ');
}
app.use('/uploads', express.static(uploadsDir));

// เส้นทาง API
app.use('/api', apiRoutes);

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

// จัดการเส้นทางที่ไม่มี
app.use((req, res) => {
  res.status(404).json({
    message: 'API endpoint ไม่พบ',
    path: req.path
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
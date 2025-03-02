// backend/src/api/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Extended Request interface เพื่อเพิ่ม user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware ตรวจสอบการยืนยันตัวตน
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // ดึง token จาก header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'ไม่ได้ยืนยันตัวตน' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // ตรวจสอบ token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // เพิ่มข้อมูลผู้ใช้ลงใน request
    req.user = { id: decoded.id, username: decoded.username };
    
    // ถ้าต้องการตรวจสอบว่า user ยังมีอยู่ในระบบหรือไม่ (แบบ async)
    // ต้องแยกออกเป็นอีก middleware หนึ่งเพื่อไม่ให้เกิดปัญหา TypeScript กับ Express
    
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    // ตรวจสอบว่า token หมดอายุหรือไม่
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        sessionExpired: true
      });
      return;
    }
    
    res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
  }
};

// Middleware สำหรับตรวจสอบบทบาทผู้ดูแลระบบ
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // ตรวจสอบว่ามีการยืนยันตัวตนก่อน
    if (!req.user) {
      res.status(401).json({ message: 'ไม่ได้ยืนยันตัวตน' });
      return;
    }
    
    // ตัวอย่าง: ตรวจสอบว่า username คือ 'admin' หรือไม่
    const isAdmin = req.user.username === 'admin' || req.user.email === 'admin@example.com';
    
    if (!isAdmin) {
      res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
  }
};
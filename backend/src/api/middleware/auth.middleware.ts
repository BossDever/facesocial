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
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ดึง token จาก header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'ไม่ได้ยืนยันตัวตน' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // ตรวจสอบ token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // ตรวจสอบว่า user ยังมีอยู่ในระบบหรือไม่
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    
    // เพิ่มข้อมูลผู้ใช้ลงใน request
    req.user = { id: user.id, username: user.username };
    
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    // ตรวจสอบว่า token หมดอายุหรือไม่
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        sessionExpired: true
      });
    }
    
    return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
  }
};

// Middleware สำหรับตรวจสอบบทบาทผู้ดูแลระบบ
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ตรวจสอบว่ามีการยืนยันตัวตนก่อน
    if (!req.user) {
      return res.status(401).json({ message: 'ไม่ได้ยืนยันตัวตน' });
    }
    
    // ตรวจสอบบทบาทของผู้ใช้
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true }
    });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
  }
};
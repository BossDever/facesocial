// backend/src/api/utils/async-handler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * ฟังก์ชันสำหรับจัดการ Async Handler ในการใช้กับ Express
 * แก้ไขปัญหา unhandled promise rejection และ TypeScript type issue
 * 
 * @param fn ฟังก์ชัน controller ที่เป็น async
 * @returns Express middleware ที่จัดการ async/await และ error
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction): void => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('Async Error:', err);
    next(err);
  });
};
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { validateFileType, validateFileSize } from '../utils/file.utils';

// กำหนดค่า multer สำหรับเก็บไฟล์ในหน่วยความจำ (memory storage)
const storage = multer.memoryStorage();

// ตรวจสอบประเภทและขนาดไฟล์
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // ตรวจสอบประเภทไฟล์
  if (!validateFileType(file.mimetype)) {
    return cb(new Error('ประเภทไฟล์ไม่รองรับ'));
  }
  
  // ตรวจสอบขนาดไฟล์ (จะตรวจสอบอีกครั้งใน limits แต่เพิ่มการตรวจสอบนี้เพื่อความชัดเจน)
  // หมายเหตุ: ในกรณีนี้ไม่สามารถใช้ validateFileSize ได้เพราะ multer ยังไม่รู้ขนาดไฟล์ที่แน่นอน
  // การตรวจสอบขนาดจะทำผ่าน limits แทน
  
  cb(null, true);
};

// กำหนดค่า multer สำหรับการอัปโหลดไฟล์
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

// Middleware สำหรับการอัปโหลดไฟล์เดียว
export const uploadSingleFile = (fieldName: string = 'file') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const multerSingle = upload.single(fieldName);
    
    multerSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // กรณีเกิด error จาก multer
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'ขนาดไฟล์เกิน 10 MB' });
          }
          return res.status(400).json({ message: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}` });
        } else {
          // กรณีเกิด error จากการตรวจสอบอื่นๆ
          return res.status(400).json({ message: err.message });
        }
      }
      
      // ถ้าไม่มีไฟล์ที่อัปโหลด
      if (!req.file) {
        return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
      }
      
      next();
    });
  };
};

// Middleware สำหรับการอัปโหลดหลายไฟล์
export const uploadMultipleFiles = (fieldName: string = 'files', maxFiles: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const multerArray = upload.array(fieldName, maxFiles);
    
    multerArray(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // กรณีเกิด error จาก multer
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'ขนาดไฟล์เกิน 10 MB' });
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: `สามารถอัปโหลดได้สูงสุด ${maxFiles} ไฟล์เท่านั้น` });
          }
          return res.status(400).json({ message: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}` });
        } else {
          // กรณีเกิด error จากการตรวจสอบอื่นๆ
          return res.status(400).json({ message: err.message });
        }
      }
      
      // ถ้าไม่มีไฟล์ที่อัปโหลด
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
      }
      
      next();
    });
  };
};

// Middleware สำหรับการอัปโหลดหลายฟิลด์
export const uploadFields = (fields: { name: string, maxCount: number }[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const multerFields = upload.fields(fields);
    
    multerFields(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // กรณีเกิด error จาก multer
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'ขนาดไฟล์เกิน 10 MB' });
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'จำนวนไฟล์เกินกำหนด' });
          }
          return res.status(400).json({ message: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}` });
        } else {
          // กรณีเกิด error จากการตรวจสอบอื่นๆ
          return res.status(400).json({ message: err.message });
        }
      }
      
      // ตรวจสอบว่ามีไฟล์ในฟิลด์ที่ต้องการหรือไม่
      // หมายเหตุ: ในบางกรณีอาจไม่จำเป็นต้องมีไฟล์ทุกฟิลด์
      // ดังนั้นจึงไม่ตรวจสอบที่นี่ ปล่อยให้ controller จัดการเอง
      
      next();
    });
  };
};
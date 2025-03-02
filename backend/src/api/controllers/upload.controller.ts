import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { 
  validateFileType, 
  getFileExtension, 
  generateUniqueFilename 
} from '../utils/file.utils';

const prisma = new PrismaClient();

// ตรวจสอบว่าโฟลเดอร์ uploads มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * อัปโหลดไฟล์หลายไฟล์ (รูปภาพหรือวิดีโอ)
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { folder = 'general' } = req.body;
    
    // ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
    }
    
    // ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
    const folderPath = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // ประมวลผลแต่ละไฟล์
    const uploadedFiles = [];
    for (const file of files) {
      // ตรวจสอบประเภทไฟล์ (เพิ่มเติมจาก Multer)
      if (!validateFileType(file.mimetype)) {
        continue; // ข้ามไฟล์ที่ไม่รองรับ
      }
      
      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const filePath = path.join(folderPath, uniqueFilename);
      const relativePath = path.join(folder, uniqueFilename).replace(/\\/g, '/');
      
      // บันทึกไฟล์
      fs.writeFileSync(filePath, file.buffer);
      
      // เพิ่มข้อมูลไฟล์ที่อัปโหลดเรียบร้อย
      uploadedFiles.push({
        originalname: file.originalname,
        filename: uniqueFilename,
        mimetype: file.mimetype,
        size: file.size,
        path: relativePath,
        url: `/uploads/${relativePath}`
      });
    }
    
    // ส่งข้อมูลไฟล์ที่อัปโหลดกลับไป
    return res.status(201).json({
      message: 'อัปโหลดไฟล์สำเร็จ',
      files: uploadedFiles
    });
  } catch (error: any) {
    console.error('Upload files error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * อัปโหลดรูปภาพโปรไฟล์
 */
export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;
    const userId = req.body.userId || (req as any).user?.id;
    
    // ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่
    if (!file) {
      return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
    }
    
    // ตรวจสอบว่า userId มีอยู่หรือไม่
    if (!userId) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    
    // ตรวจสอบว่าผู้ใช้มีอยู่จริงในฐานข้อมูล
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }
    
    // ตรวจสอบว่าเป็นรูปภาพหรือไม่
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'ไฟล์ต้องเป็นรูปภาพเท่านั้น' });
    }
    
    // ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
    const profileImagesDir = path.join(UPLOADS_DIR, 'profile-images');
    if (!fs.existsSync(profileImagesDir)) {
      fs.mkdirSync(profileImagesDir, { recursive: true });
    }
    
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const uniqueFilename = `${userId}-${Date.now()}${getFileExtension(file.originalname)}`;
    const filePath = path.join(profileImagesDir, uniqueFilename);
    const relativePath = path.join('profile-images', uniqueFilename).replace(/\\/g, '/');
    
    // บันทึกไฟล์
    fs.writeFileSync(filePath, file.buffer);
    
    // ลบรูปโปรไฟล์เดิม (ถ้ามี)
    if (user.profileImage) {
      const oldImagePath = path.join(UPLOADS_DIR, user.profileImage.replace(/^\/uploads\//, ''));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // อัปเดตข้อมูลผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: `/uploads/${relativePath}`
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImage: true
      }
    });
    
    return res.status(200).json({
      message: 'อัปโหลดรูปโปรไฟล์สำเร็จ',
      user: updatedUser,
      url: `/uploads/${relativePath}`
    });
  } catch (error: any) {
    console.error('Upload profile image error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * อัปโหลดมีเดียสำหรับโพสต์
 */
export const uploadPostMedia = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = (req as any).user?.id;
    const { postId } = req.body;
    
    // ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
    }
    
    // ตรวจสอบว่า userId มีอยู่หรือไม่
    if (!userId) {
      return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
    }
    
    // ตรวจสอบว่า postId มีอยู่หรือไม่
    if (postId) {
      // ตรวจสอบว่าโพสต์มีอยู่จริงในฐานข้อมูล
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });
      
      if (!post) {
        return res.status(404).json({ message: 'ไม่พบโพสต์' });
      }
      
      // ตรวจสอบว่าเป็นเจ้าของโพสต์หรือไม่
      if (post.userId !== userId) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์อัปโหลดไฟล์ในโพสต์นี้' });
      }
    }
    
    // ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
    const postMediaDir = path.join(UPLOADS_DIR, 'post-media');
    if (!fs.existsSync(postMediaDir)) {
      fs.mkdirSync(postMediaDir, { recursive: true });
    }
    
    // ประมวลผลแต่ละไฟล์
    const uploadedFiles = [];
    for (const file of files) {
      // ตรวจสอบประเภทไฟล์ (เพิ่มเติมจาก Multer)
      if (!validateFileType(file.mimetype)) {
        continue; // ข้ามไฟล์ที่ไม่รองรับ
      }
      
      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const filePath = path.join(postMediaDir, uniqueFilename);
      const relativePath = path.join('post-media', uniqueFilename).replace(/\\/g, '/');
      
      // บันทึกไฟล์
      fs.writeFileSync(filePath, file.buffer);
      
      // กำหนดประเภทมีเดีย
      const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      // สร้างข้อมูลมีเดียในฐานข้อมูล (ถ้ามี postId)
      let media = null;
      if (postId) {
        media = await prisma.media.create({
          data: {
            postId,
            type: mediaType,
            url: `/uploads/${relativePath}`,
            filename: uniqueFilename,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            size: file.size
          }
        });
      }
      
      // เพิ่มข้อมูลไฟล์ที่อัปโหลดเรียบร้อย
      uploadedFiles.push({
        id: media?.id,
        originalname: file.originalname,
        filename: uniqueFilename,
        mimetype: file.mimetype,
        size: file.size,
        type: mediaType,
        path: relativePath,
        url: `/uploads/${relativePath}`
      });
    }
    
    // ส่งข้อมูลไฟล์ที่อัปโหลดกลับไป
    return res.status(201).json({
      message: 'อัปโหลดไฟล์สำเร็จ',
      files: uploadedFiles
    });
  } catch (error: any) {
    console.error('Upload post media error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
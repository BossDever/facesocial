import path from 'path';
import crypto from 'crypto';

/**
 * ตรวจสอบว่า mimetype เป็นประเภทที่รองรับหรือไม่
 * @param mimetype MIME type ของไฟล์
 * @returns ผลการตรวจสอบ
 */
export function validateFileType(mimetype: string): boolean {
  const allowedTypes = [
    // รูปภาพ
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // วิดีโอ
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ];
  
  return allowedTypes.includes(mimetype);
}

/**
 * ดึงนามสกุลไฟล์จากชื่อไฟล์
 * @param filename ชื่อไฟล์
 * @returns นามสกุลไฟล์พร้อมจุด (เช่น .jpg, .png)
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename);
}

/**
 * สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
 * @param originalFilename ชื่อไฟล์ต้นฉบับ
 * @returns ชื่อไฟล์ที่ไม่ซ้ำกัน
 */
export function generateUniqueFilename(originalFilename: string): string {
  const extension = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  
  return `${timestamp}-${randomString}${extension}`;
}

/**
 * สร้างโฟลเดอร์สำหรับเก็บไฟล์ตาม mimetype
 * @param mimetype MIME type ของไฟล์
 * @returns ชื่อโฟลเดอร์ (เช่น images, videos)
 */
export function getMediaFolder(mimetype: string): string {
  if (mimetype.startsWith('image/')) {
    return 'images';
  } else if (mimetype.startsWith('video/')) {
    return 'videos';
  } else {
    return 'others';
  }
}

/**
 * แปลงขนาดไฟล์เป็นรูปแบบที่อ่านง่าย
 * @param bytes ขนาดไฟล์เป็นไบต์
 * @returns ขนาดไฟล์ในรูปแบบที่อ่านง่าย (เช่น 1.23 KB, 4.56 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * ตรวจสอบขนาดไฟล์ว่าไม่เกินขนาดที่กำหนด
 * @param fileSize ขนาดไฟล์เป็นไบต์
 * @param maxSizeMB ขนาดสูงสุดที่ยอมรับ (MB)
 * @returns ผลการตรวจสอบ
 */
export function validateFileSize(fileSize: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
}

/**
 * ตรวจสอบว่าไฟล์เป็นรูปภาพหรือไม่
 * @param mimetype MIME type ของไฟล์
 * @returns ผลการตรวจสอบ
 */
export function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

/**
 * ตรวจสอบว่าไฟล์เป็นวิดีโอหรือไม่
 * @param mimetype MIME type ของไฟล์
 * @returns ผลการตรวจสอบ
 */
export function isVideo(mimetype: string): boolean {
  return mimetype.startsWith('video/');
}
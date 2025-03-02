'use client';

import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Upload Service สำหรับการจัดการการอัปโหลดไฟล์
 */
class UploadService {
  /**
   * อัปโหลดไฟล์ไปยังเซิร์ฟเวอร์
   * @param files ไฟล์ที่ต้องการอัปโหลด (สามารถอัปโหลดได้หลายไฟล์)
   * @param folder โฟลเดอร์ที่ต้องการเก็บไฟล์ (เช่น 'images', 'videos', etc.)
   * @param onProgress ฟังก์ชันเรียกเมื่อมีความคืบหน้าในการอัปโหลด
   * @returns ข้อมูลไฟล์ที่อัปโหลดแล้ว
   */
  async uploadFiles(
    files: File[], 
    folder: string = 'general', 
    onProgress?: (progress: number) => void
  ): Promise<{ originalname: string; filename: string; path: string; url: string; }[]> {
    try {
      const formData = new FormData();
      
      // เพิ่มไฟล์ลงใน FormData
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // เพิ่มโฟลเดอร์ที่ต้องการเก็บไฟล์
      formData.append('folder', folder);
      
      // อัปโหลดไฟล์พร้อมติดตามความคืบหน้า
      const response = await apiService.post(API_ENDPOINTS.UPLOAD.FILES, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      });
      
      return response.files || [];
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw error;
    }
  }
  
  /**
   * อัปโหลดรูปภาพโปรไฟล์
   * @param file ไฟล์รูปภาพ
   * @param userId ID ของผู้ใช้ (ถ้าไม่ระบุจะใช้ผู้ใช้ปัจจุบัน)
   * @param onProgress ฟังก์ชันเรียกเมื่อมีความคืบหน้าในการอัปโหลด
   * @returns ข้อมูลไฟล์ที่อัปโหลดแล้ว
   */
  async uploadProfileImage(
    file: File, 
    userId?: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (userId) {
        formData.append('userId', userId);
      }
      
      // อัปโหลดรูปภาพโปรไฟล์พร้อมติดตามความคืบหน้า
      const response = await apiService.post(API_ENDPOINTS.UPLOAD.PROFILE_IMAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      });
      
      return response;
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      throw error;
    }
  }
  
  /**
   * ตรวจสอบว่าไฟล์มีขนาดและประเภทที่ถูกต้องหรือไม่
   * @param file ไฟล์ที่ต้องการตรวจสอบ
   * @param maxSize ขนาดสูงสุดที่ยอมรับ (MB)
   * @param acceptedTypes ประเภทไฟล์ที่ยอมรับ (array ของ MIME type)
   * @returns ผลการตรวจสอบ
   */
  validateFile(
    file: File, 
    maxSize: number = 10, 
    acceptedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm']
  ): { valid: boolean; error?: string } {
    // ตรวจสอบประเภทไฟล์
    if (!acceptedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `ประเภทไฟล์ไม่ถูกต้อง รองรับเฉพาะ: ${acceptedTypes.join(', ')}`
      };
    }
    
    // ตรวจสอบขนาดไฟล์ (MB)
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      return {
        valid: false,
        error: `ไฟล์มีขนาดใหญ่เกินไป (${fileSizeInMB.toFixed(2)} MB) ขนาดสูงสุดที่ยอมรับคือ ${maxSize} MB`
      };
    }
    
    return { valid: true };
  }
  
  /**
   * ดาวน์โหลดไฟล์จาก URL
   * @param url URL ของไฟล์ที่ต้องการดาวน์โหลด
   * @param filename ชื่อไฟล์ที่ต้องการบันทึก
   */
  downloadFile(url: string, filename?: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || url.split('/').pop() || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// สร้าง Singleton instance ของ UploadService
const uploadService = new UploadService();

export default uploadService;
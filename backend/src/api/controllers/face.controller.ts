// backend/src/api/controllers/face.controller.ts

import { Request, Response } from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

// URL ของ FaceNet API
const FACENET_API_URL = process.env.FACENET_API_URL || 'http://localhost:8000';

// ตำแหน่งสำหรับเก็บรูปภาพชั่วคราว
const TEMP_DIR = path.join(__dirname, '../../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ตรวจสอบความพร้อมของ API
export const checkHealth = async (req: Request, res: Response) => {
  try {
    // ส่งคำขอไปยัง FaceNet API
    const response = await axios.get(`${FACENET_API_URL}/health`, { timeout: 5000 });
    
    return res.status(200).json({
      status: response.data.status || 'ready',
      message: response.data.message || 'Face API พร้อมใช้งาน',
      timestamp: new Date()
    });
  } catch (error: any) {
    console.error('Face API health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// สร้าง face embeddings
export const createEmbeddings = async (req: Request, res: Response) => {
  try {
    console.log('API createEmbeddings ถูกเรียกใช้');
    
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!req.body.image_data) {
      console.error('ไม่พบข้อมูลรูปภาพในคำขอ');
      return res.status(400).json({
        message: 'ไม่พบข้อมูลรูปภาพ'
      });
    }
    
    // บันทึกข้อมูลการส่งคำขอ (สำหรับ debug)
    console.log('กำลังส่งข้อมูลไปยัง FaceNet API');
    
    // ส่งข้อมูลไปยัง FaceNet API
    const formData = new FormData();
    formData.append('image_data', req.body.image_data);
    
    console.log(`ส่งคำขอไปยัง ${FACENET_API_URL}/generate-embeddings/base64/`);
    
    const response = await axios.post(`${FACENET_API_URL}/generate-embeddings/base64/`, 
      formData,
      { 
        timeout: 15000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    console.log('ได้รับการตอบกลับจาก FaceNet API:', response.status);
    
    return res.status(200).json({
      message: 'สร้าง face embeddings สำเร็จ',
      embeddings: response.data.embeddings
    });
  } catch (error: any) {
    console.error('Create face embeddings error:', error);
    
    // บันทึกข้อมูลข้อผิดพลาดเพิ่มเติม (สำหรับ debug)
    if (error.response) {
      console.error('ข้อมูลข้อผิดพลาดจาก API:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // สร้าง embeddings จำลองในกรณีที่เกิดข้อผิดพลาด
    if (process.env.NODE_ENV === 'development') {
      console.log('กำลังสร้าง embeddings จำลองเนื่องจากเกิดข้อผิดพลาด');
      
      // สร้าง embeddings จำลอง (128 มิติ)
      const dummyEmbeddings = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
      
      // ปรับให้ค่า L2 norm = 1
      const squaredSum = dummyEmbeddings.reduce((sum, val) => sum + val * val, 0);
      const vectorLength = Math.sqrt(squaredSum);
      const normalizedEmbeddings = dummyEmbeddings.map(val => val / vectorLength);
      
      return res.status(200).json({
        message: 'สร้าง face embeddings แบบจำลองสำเร็จ (ในโหมด development)',
        embeddings: normalizedEmbeddings,
        isDummy: true
      });
    }
    
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการสร้าง face embeddings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ตรวจจับใบหน้าในรูปภาพ
export const detectFaces = async (req: Request, res: Response) => {
  try {
    console.log('API detectFaces ถูกเรียกใช้');
    
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!req.body.image_data) {
      console.error('ไม่พบข้อมูลรูปภาพในคำขอ');
      return res.status(400).json({
        message: 'ไม่พบข้อมูลรูปภาพ'
      });
    }
    
    // บันทึกข้อมูลว่ากำลังส่งคำขอไปยัง FaceNet API
    console.log('กำลังส่งข้อมูลไปยัง FaceNet API');
    
    // ตรวจสอบรูปแบบของข้อมูลรูปภาพว่าเป็น base64 string ที่ถูกต้องหรือไม่
    let imageData = req.body.image_data;
    
    // ตรวจสอบว่าเป็น data URL หรือไม่
    if (!imageData.startsWith('data:image') && !imageData.startsWith('data:application')) {
      // เพิ่ม prefix ให้กับ base64 string ถ้าไม่มี
      imageData = `data:image/jpeg;base64,${imageData}`;
    }
    
    // สร้าง FormData
    const formData = new FormData();
    formData.append('image_data', imageData);
    
    console.log(`ส่งคำขอไปยัง ${FACENET_API_URL}/detect`);
    
    // ส่งข้อมูลไปยัง FaceNet API
    const response = await axios.post(`${FACENET_API_URL}/detect`, 
      formData,
      { 
        timeout: 15000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    console.log('ได้รับการตอบกลับจาก FaceNet API:', response.status);
    
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Detect faces error:', error);
    
    // บันทึกข้อมูลข้อผิดพลาดเพิ่มเติม (สำหรับ debug)
    if (error.response) {
      console.error('ข้อมูลข้อผิดพลาดจาก API:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // สร้างผลลัพธ์จำลองในกรณีที่เกิดข้อผิดพลาด
    if (process.env.NODE_ENV === 'development') {
      console.log('กำลังสร้างผลลัพธ์การตรวจจับใบหน้าจำลองเนื่องจากเกิดข้อผิดพลาด');
      
      return res.status(200).json({
        faceDetected: true,
        faceCount: 1,
        score: 90 + Math.random() * 10, // คะแนนระหว่าง 90-100
        faceBox: {
          top: 50,
          left: 50,
          width: 200,
          height: 200
        },
        isDummy: true
      });
    }
    
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการตรวจจับใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// เปรียบเทียบใบหน้าสองใบหน้า
export const compareFaces = async (req: Request, res: Response) => {
  try {
    console.log('API compareFaces ถูกเรียกใช้');
    
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!req.body.image1 || !req.body.image2) {
      console.error('ไม่พบข้อมูลรูปภาพในคำขอ');
      return res.status(400).json({
        message: 'ไม่พบข้อมูลรูปภาพทั้งสองรูป'
      });
    }
    
    // บันทึกข้อมูลว่ากำลังส่งคำขอไปยัง FaceNet API
    console.log('กำลังส่งข้อมูลไปยัง FaceNet API');
    
    // ตรวจสอบรูปแบบของข้อมูลรูปภาพ
    let image1 = req.body.image1;
    let image2 = req.body.image2;
    
    // ตรวจสอบว่าเป็น data URL หรือไม่
    if (!image1.startsWith('data:image') && !image1.startsWith('data:application')) {
      image1 = `data:image/jpeg;base64,${image1}`;
    }
    
    if (!image2.startsWith('data:image') && !image2.startsWith('data:application')) {
      image2 = `data:image/jpeg;base64,${image2}`;
    }
    
    console.log(`ส่งคำขอไปยัง ${FACENET_API_URL}/compare`);
    
    // ส่งข้อมูลไปยัง FaceNet API
    const response = await axios.post(`${FACENET_API_URL}/compare`, 
      {
        image1,
        image2
      },
      { 
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('ได้รับการตอบกลับจาก FaceNet API:', response.status);
    
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Compare faces error:', error);
    
    // บันทึกข้อมูลข้อผิดพลาดเพิ่มเติม (สำหรับ debug)
    if (error.response) {
      console.error('ข้อมูลข้อผิดพลาดจาก API:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // สร้างผลลัพธ์จำลองในกรณีที่เกิดข้อผิดพลาด
    if (process.env.NODE_ENV === 'development') {
      console.log('กำลังสร้างผลลัพธ์การเปรียบเทียบใบหน้าจำลองเนื่องจากเกิดข้อผิดพลาด');
      
      const similarity = 0.6 + Math.random() * 0.4; // ค่าความเหมือนระหว่าง 0.6-1.0
      
      return res.status(200).json({
        similarity,
        isSame: similarity > 0.7,
        distance: 1 - similarity,
        isDummy: true
      });
    }
    
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเปรียบเทียบใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
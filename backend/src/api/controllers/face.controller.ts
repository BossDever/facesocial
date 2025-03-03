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
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!req.body.image_data) {
      return res.status(400).json({
        message: 'ไม่พบข้อมูลรูปภาพ'
      });
    }
    
    // ส่งข้อมูลไปยัง FaceNet API
    const formData = new FormData();
    formData.append('image_data', req.body.image_data);
    
    const response = await axios.post(`${FACENET_API_URL}/generate-embeddings/base64/`, 
      formData,
      { 
        timeout: 10000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return res.status(200).json({
      message: 'สร้าง face embeddings สำเร็จ',
      embeddings: response.data.embeddings
    });
  } catch (error: any) {
    console.error('Create face embeddings error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการสร้าง face embeddings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ตรวจจับใบหน้าในรูปภาพ
export const detectFaces = async (req: Request, res: Response) => {
  try {
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!req.body.image_data) {
      return res.status(400).json({
        message: 'ไม่พบข้อมูลรูปภาพ'
      });
    }
    
    // ส่งข้อมูลไปยัง FaceNet API
    const formData = new FormData();
    formData.append('image_data', req.body.image_data);
    
    const response = await axios.post(`${FACENET_API_URL}/detect`, 
      formData,
      { 
        timeout: 10000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Detect faces error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการตรวจจับใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// เปรียบเทียบใบหน้าสองใบหน้า
export const compareFaces = async (req: Request, res: Response) => {
  try {
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!req.body.image1 || !req.body.image2) {
      return res.status(400).json({
        message: 'ไม่พบข้อมูลรูปภาพทั้งสองรูป'
      });
    }
    
    // ส่งข้อมูลไปยัง FaceNet API
    const response = await axios.post(`${FACENET_API_URL}/compare`, 
      {
        image1: req.body.image1,
        image2: req.body.image2
      },
      { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Compare faces error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเปรียบเทียบใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
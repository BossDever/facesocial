// backend/src/api/controllers/face.controller.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// โหลดโมเดล FaceNet
let facenetModel: tf.GraphModel | null = null;
const MODEL_PATH = process.env.FACENET_MODEL_PATH || 'file://./models/facenet/20180402-114759/20180402-114759.pb';

// ตำแหน่งสำหรับเก็บรูปภาพชั่วคราว
const TEMP_DIR = path.join(__dirname, '../../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// โหลดโมเดล FaceNet
async function loadFaceNetModel() {
  try {
    console.log('กำลังโหลดโมเดล FaceNet...');
    facenetModel = await tf.loadGraphModel(MODEL_PATH);
    console.log('โหลดโมเดล FaceNet สำเร็จ');
    
    // ทดสอบโมเดล
    const dummyInput = tf.zeros([1, 160, 160, 3]);
    const result = facenetModel.execute(dummyInput) as tf.Tensor;
    result.dispose();
    dummyInput.dispose();
    
    console.log('โมเดล FaceNet พร้อมใช้งาน');
    return true;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการโหลดโมเดล FaceNet:', error);
    return false;
  }
}

// เตรียมรูปภาพสำหรับโมเดล FaceNet
function preprocessImage(imageBuffer: Buffer): tf.Tensor {
  // อ่านรูปภาพจาก buffer
  const image = tf.node.decodeImage(imageBuffer, 3);
  
  // ปรับขนาดรูปภาพเป็น 160x160
  const resizedImage = tf.image.resizeBilinear(image, [160, 160]);
  
  // Normalize รูปภาพ
  const normalized = resizedImage.toFloat().div(tf.scalar(255));
  
  // คืนค่า tensor ที่ปรับแต่งแล้ว
  return normalized;
}

// สร้าง face embeddings
async function generateEmbeddings(imageBuffer: Buffer): Promise<number[]> {
  // โหลดโมเดลถ้ายังไม่ได้โหลด
  if (!facenetModel) {
    await loadFaceNetModel();
  }
  
  // ตรวจสอบว่าโหลดโมเดลสำเร็จหรือไม่
  if (!facenetModel) {
    throw new Error('ไม่สามารถโหลดโมเดล FaceNet ได้');
  }
  
  // ประมวลผลรูปภาพ
  const processedImage = preprocessImage(imageBuffer);
  
  // เพิ่มมิติ batch
  const batchedImage = processedImage.expandDims(0);
  
  // สร้าง embeddings
  const embeddings = facenetModel.execute(batchedImage) as tf.Tensor;
  
  // แปลง tensor เป็น array
  const embeddingsArray = await embeddings.data();
  
  // ทำความสะอาด memory
  processedImage.dispose();
  batchedImage.dispose();
  embeddings.dispose();
  
  // คืนค่า embeddings เป็น array
  return Array.from(embeddingsArray);
}

// ตรวจสอบความพร้อมของ API
export const checkHealth = async (req: Request, res: Response) => {
  try {
    // ตรวจสอบการโหลดโมเดล
    const modelReady = facenetModel !== null || await loadFaceNetModel();
    
    return res.status(200).json({
      status: modelReady ? 'ready' : 'not_ready',
      message: modelReady ? 'Face API พร้อมใช้งาน' : 'กำลังโหลดโมเดล FaceNet',
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
    
    // แปลง base64 เป็น buffer
    const base64Data = req.body.image_data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // สร้าง embeddings
    const embeddings = await generateEmbeddings(imageBuffer);
    
    return res.status(200).json({
      message: 'สร้าง face embeddings สำเร็จ',
      embeddings
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
    
    // แปลง base64 เป็น buffer
    const base64Data = req.body.image_data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // บันทึกรูปภาพลงไฟล์ชั่วคราว (ถ้าต้องการ)
    const tempFilePath = path.join(TEMP_DIR, `temp_${Date.now()}.jpg`);
    fs.writeFileSync(tempFilePath, imageBuffer);
    
    // TODO: ใช้ BlazeFace หรือ MTCNN เพื่อตรวจจับใบหน้า
    
    // จำลองผลลัพธ์การตรวจจับใบหน้า
    const detectionResult = {
      faceDetected: true,
      faceCount: 1,
      score: 95,
      faceBox: {
        top: 50,
        left: 50,
        width: 200,
        height: 200
      }
    };
    
    // ลบไฟล์ชั่วคราว
    fs.unlinkSync(tempFilePath);
    
    return res.status(200).json(detectionResult);
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
    
    // แปลง base64 เป็น buffer
    const base64Data1 = req.body.image1.replace(/^data:image\/\w+;base64,/, '');
    const base64Data2 = req.body.image2.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer1 = Buffer.from(base64Data1, 'base64');
    const imageBuffer2 = Buffer.from(base64Data2, 'base64');
    
    // สร้าง embeddings สำหรับทั้งสองรูป
    const embeddings1 = await generateEmbeddings(imageBuffer1);
    const embeddings2 = await generateEmbeddings(imageBuffer2);
    
    // คำนวณระยะห่างระหว่าง embeddings
    let sumSquaredDiff = 0;
    for (let i = 0; i < embeddings1.length; i++) {
      const diff = embeddings1[i] - embeddings2[i];
      sumSquaredDiff += diff * diff;
    }
    const distance = Math.sqrt(sumSquaredDiff);
    
    // ค่า threshold สำหรับการเปรียบเทียบ
    const threshold = 0.6;
    const isSamePerson = distance < threshold;
    
    return res.status(200).json({
      message: 'เปรียบเทียบใบหน้าสำเร็จ',
      distance,
      threshold,
      isSamePerson,
      confidence: 1 - distance
    });
  } catch (error: any) {
    console.error('Compare faces error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเปรียบเทียบใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// โหลดโมเดลโดยอัตโนมัติเมื่อเริ่มต้น server
loadFaceNetModel();
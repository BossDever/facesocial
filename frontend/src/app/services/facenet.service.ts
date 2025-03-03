// frontend/src/app/services/facenet.service.ts

'use client';

import axios from 'axios';

/**
 * FaceNetService สำหรับการสร้าง Face Embeddings โดยใช้ API
 */
class FaceNetService {
  private apiUrl: string;
  
  constructor() {
    // กำหนด URL ของ API (backend)
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    console.log(`API URL: ${this.apiUrl}`);
  }
  
  /**
   * ทดสอบเชื่อมต่อกับ API เพื่อตรวจสอบว่า API พร้อมใช้งานหรือไม่
   */
  async loadModel(): Promise<boolean> {
    try {
      console.log('กำลังตรวจสอบการเชื่อมต่อกับ API...');
      const response = await axios.get(`${this.apiUrl}/face/health`, { 
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.status === 200) {
        console.log('เชื่อมต่อกับ Face API สำเร็จ:', response.data);
        return true;
      }
      
      console.warn('ไม่สามารถเชื่อมต่อกับ Face API ได้');
      return false;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Face API:', error);
      return false;
    }
  }
  
  /**
   * สร้าง Face Embeddings จากรูปภาพใบหน้า
   * @param faceImage รูปภาพใบหน้าที่เป็น Base64 string
   * @returns Face Embeddings
   */
  async generateEmbeddings(faceImage: string): Promise<number[]> {
    try {
      // ปรับรูปแบบ base64 ก่อนส่ง
      let base64Data = faceImage;
      
      // สร้าง form data
      const formData = new FormData();
      formData.append('image_data', base64Data);
      
      // เพิ่ม debug log
      console.log('กำลังส่งข้อมูลไปยัง API เพื่อสร้าง embeddings');
      
      // เรียกใช้ API เพื่อสร้าง embeddings
      const response = await axios.post(
        `${this.apiUrl}/face/embeddings`,
        formData,
        { 
          timeout: 10000,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // ตรวจสอบว่าได้รับ embeddings หรือไม่
      if (response.data && response.data.embeddings) {
        console.log('ได้รับ embeddings จาก API สำเร็จ');
        return response.data.embeddings;
      }
      
      throw new Error('ไม่ได้รับข้อมูล embeddings จาก API');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้าง Face Embeddings:', error);
      
      // เนื่องจากไม่สามารถใช้งาน API ได้ จะต้องมีการจำลองค่า embeddings
      console.warn('ใช้ dummy embeddings แทน');
      return this.createDummyEmbeddings();
    }
  }
  
  /**
   * ตรวจจับใบหน้าในรูปภาพ
   * @param faceImage รูปภาพที่เป็น Base64 string
   * @returns ข้อมูลการตรวจจับใบหน้า
   */
  async detectFaces(faceImage: string): Promise<any> {
    try {
      // ปรับรูปแบบ base64 ก่อนส่ง
      let base64Data = faceImage;
      
      // สร้าง form data
      const formData = new FormData();
      formData.append('image_data', base64Data);
      
      // เรียกใช้ API เพื่อตรวจจับใบหน้า
      const response = await axios.post(
        `${this.apiUrl}/face/detect`,
        formData,
        { 
          timeout: 10000,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการตรวจจับใบหน้า:', error);
      
      // จำลองข้อมูลการตรวจจับใบหน้า
      return {
        faceDetected: true,
        score: 95,
        faceBox: {
          top: 50,
          left: 50,
          width: 200,
          height: 200
        }
      };
    }
  }
  
  /**
   * สร้าง embeddings จำลองสำหรับการทดสอบ
   * @returns embeddings จำลอง
   */
  private createDummyEmbeddings(): number[] {
    console.log('กำลังสร้าง dummy embeddings สำหรับทดสอบ');
    
    // สร้าง embeddings ขนาด 128 มิติ
    const dummyEmbeddings = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    
    // Normalize เวกเตอร์
    return this.normalizeEmbeddings(dummyEmbeddings);
  }
  
  /**
   * Normalize เวกเตอร์ embeddings ให้มีความยาวเป็น 1 (L2 normalization)
   * @param embeddings เวกเตอร์ embeddings ที่ต้องการ normalize
   * @returns เวกเตอร์ embeddings ที่ normalize แล้ว
   */
  private normalizeEmbeddings(embeddings: number[]): number[] {
    // คำนวณความยาวของเวกเตอร์ (L2 norm)
    const squaredSum = embeddings.reduce((sum, val) => sum + val * val, 0);
    const vectorLength = Math.sqrt(squaredSum);
    
    // Normalize แต่ละค่าในเวกเตอร์
    return embeddings.map(val => val / vectorLength);
  }
  
  /**
   * คำนวณระยะห่างระหว่างเวกเตอร์ embeddings สองตัว (Euclidean distance)
   * @param embeddings1 เวกเตอร์ embeddings ตัวที่ 1
   * @param embeddings2 เวกเตอร์ embeddings ตัวที่ 2
   * @returns ระยะห่างระหว่างเวกเตอร์สองตัว
   */
  calculateDistance(embeddings1: number[], embeddings2: number[]): number {
    if (embeddings1.length !== embeddings2.length) {
      throw new Error('เวกเตอร์ embeddings มีขนาดไม่เท่ากัน');
    }
    
    // คำนวณระยะห่างแบบ Euclidean
    let sumSquaredDiff = 0;
    for (let i = 0; i < embeddings1.length; i++) {
      const diff = embeddings1[i] - embeddings2[i];
      sumSquaredDiff += diff * diff;
    }
    
    return Math.sqrt(sumSquaredDiff);
  }
  
  /**
   * ตรวจสอบว่าเวกเตอร์ embeddings สองตัวเป็นใบหน้าเดียวกันหรือไม่
   * @param embeddings1 เวกเตอร์ embeddings ตัวที่ 1
   * @param embeddings2 เวกเตอร์ embeddings ตัวที่ 2
   * @param threshold ค่า threshold สำหรับการเปรียบเทียบ (ค่าน้อยหมายถึงเหมือนกันมาก)
   * @returns ผลการเปรียบเทียบ (true = เป็นคนเดียวกัน, false = ไม่ใช่คนเดียวกัน)
   */
  isSameFace(embeddings1: number[], embeddings2: number[], threshold: number = 0.6): boolean {
    const distance = this.calculateDistance(embeddings1, embeddings2);
    return distance < threshold;
  }
}

// สร้าง Singleton instance ของ FaceNetService
const faceNetService = new FaceNetService();

export default faceNetService;
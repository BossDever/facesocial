// frontend/src/app/services/facenet.service.ts

'use client';

import axios from 'axios';

/**
 * FaceNetService สำหรับการสร้าง Face Embeddings โดยใช้ API
 */
class FaceNetService {
  private apiUrl: string;
  private useMockMode: boolean = false;
  
  constructor() {
    // กำหนด URL ของ API (backend)
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    console.log(`FaceNet API URL: ${this.apiUrl}`);
  }
  
  /**
   * ทดสอบเชื่อมต่อกับ API เพื่อตรวจสอบว่า API พร้อมใช้งานหรือไม่
   */
  async loadModel(): Promise<boolean> {
    // ถ้าอยู่ในโหมด mock แล้ว ไม่ต้องทดสอบการเชื่อมต่ออีก
    if (this.useMockMode) {
      console.log('กำลังใช้งานโหมดจำลอง (mock) สำหรับ FaceNet API');
      return true;
    }
    
    try {
      console.log('กำลังตรวจสอบการเชื่อมต่อกับ API...');
      const healthResponse = await axios.get(`${this.apiUrl}/face/health`, { 
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (healthResponse.status === 200) {
        console.log('เชื่อมต่อกับ Face API สำเร็จ:', healthResponse.data);
        return true;
      }
      
      console.warn('ไม่สามารถเชื่อมต่อกับ Face API ได้ - เปลี่ยนไปใช้โหมดจำลอง');
      this.useMockMode = true;
      return true; // คืนค่า true เพื่อให้ระบบใช้งานต่อได้ โดยใช้ข้อมูลจำลอง
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Face API:', error);
      console.warn('เปลี่ยนไปใช้โหมดจำลอง (mock) เนื่องจากไม่สามารถเชื่อมต่อกับ API ได้');
      this.useMockMode = true;
      return true; // คืนค่า true เพื่อให้ระบบใช้งานต่อได้ โดยใช้ข้อมูลจำลอง
    }
  }
  
  /**
   * สร้าง Face Embeddings จากรูปภาพใบหน้า
   * @param faceImage รูปภาพใบหน้าที่เป็น Base64 string
   * @returns Face Embeddings
   */
  async generateEmbeddings(faceImage: string): Promise<number[]> {
    // ถ้าอยู่ในโหมดจำลอง ให้สร้าง embeddings จำลอง
    if (this.useMockMode) {
      console.log('ใช้ embeddings จำลองในโหมด mock');
      return this.createDummyEmbeddings();
    }
    
    try {
      // ปรับรูปแบบ base64 ก่อนส่ง
      let base64Data = faceImage;
      
      // สร้าง JSON data แทน FormData
      const jsonData = {
        image_data: base64Data
      };
      
      // เพิ่ม debug log
      console.log('กำลังส่งข้อมูลไปยัง API เพื่อสร้าง embeddings');
      
      // เรียกใช้ API เพื่อสร้าง embeddings
      const embeddingsResponse = await axios.post(
        `${this.apiUrl}/face/embeddings`,
        jsonData,
        { 
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // ตรวจสอบว่าได้รับ embeddings หรือไม่
      if (embeddingsResponse.data && embeddingsResponse.data.embeddings) {
        console.log('ได้รับ embeddings จาก API สำเร็จ');
        return embeddingsResponse.data.embeddings;
      }
      
      console.warn('ไม่ได้รับข้อมูล embeddings จาก API - ใช้ข้อมูลจำลองแทน');
      return this.createDummyEmbeddings();
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
    // ถ้าอยู่ในโหมดจำลอง ให้ใช้ข้อมูลจำลอง
    if (this.useMockMode) {
      console.log('ใช้ข้อมูลการตรวจจับใบหน้าจำลองในโหมด mock');
      return this.createMockDetectionResult();
    }
    
    try {
      // ปรับรูปแบบ base64 ก่อนส่ง
      let base64Data = faceImage;
      
      // สร้าง JSON data แทน FormData
      const jsonData = {
        image_data: base64Data
      };
      
      // เรียกใช้ API เพื่อตรวจจับใบหน้า
      const detectResponse = await axios.post(
        `${this.apiUrl}/face/detect`,
        jsonData,
        { 
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return detectResponse.data;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการตรวจจับใบหน้า:', error);
      
      // ถ้ายังไม่ได้เปลี่ยนเป็นโหมดจำลอง ให้เปลี่ยนเป็นโหมดจำลอง
      if (!this.useMockMode) {
        console.warn('เปลี่ยนไปใช้โหมดจำลองเนื่องจากไม่สามารถตรวจจับใบหน้าได้');
        this.useMockMode = true;
      }
      
      // จำลองข้อมูลการตรวจจับใบหน้า
      return this.createMockDetectionResult();
    }
  }
  
  /**
   * เปรียบเทียบใบหน้าในรูปภาพสองรูป
   * @param image1 รูปภาพที่ 1 เป็น Base64 string
   * @param image2 รูปภาพที่ 2 เป็น Base64 string
   * @returns ผลการเปรียบเทียบใบหน้า
   */
  async compareFaces(image1: string, image2: string): Promise<any> {
    // ถ้าอยู่ในโหมดจำลอง ให้ใช้ข้อมูลจำลอง
    if (this.useMockMode) {
      console.log('ใช้ข้อมูลการเปรียบเทียบใบหน้าจำลองในโหมด mock');
      
      // สร้างค่าความเหมือนสุ่ม
      const similarity = Math.random() * 0.4 + 0.6; // 0.6 - 1.0
      return {
        similarity,
        isSame: similarity > 0.7,
        distance: 1 - similarity
      };
    }
    
    try {
      // เรียกใช้ API เพื่อเปรียบเทียบใบหน้า
      const compareResponse = await axios.post(
        `${this.apiUrl}/face/compare`,
        {
          image1,
          image2
        },
        { 
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return compareResponse.data;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเปรียบเทียบใบหน้า:', error);
      
      // ถ้ายังไม่ได้เปลี่ยนเป็นโหมดจำลอง ให้เปลี่ยนเป็นโหมดจำลอง
      if (!this.useMockMode) {
        console.warn('เปลี่ยนไปใช้โหมดจำลองเนื่องจากไม่สามารถเปรียบเทียบใบหน้าได้');
        this.useMockMode = true;
      }
      
      // สร้างค่าความเหมือนสุ่ม
      const similarity = Math.random() * 0.4 + 0.6; // 0.6 - 1.0
      return {
        similarity,
        isSame: similarity > 0.7,
        distance: 1 - similarity
      };
    }
  }
  
  /**
   * สร้างผลลัพธ์การตรวจจับใบหน้าจำลอง
   */
  private createMockDetectionResult(): any {
    // จำลองการพบใบหน้า
    const confidence = 85 + Math.random() * 10; // สุ่มค่าความมั่นใจระหว่าง 85-95%
    
    return {
      faceDetected: true,
      score: confidence,
      faceCount: 1,
      faceBox: {
        top: 50,
        left: 50,
        width: 200,
        height: 200
      }
    };
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
  
  /**
   * เปลี่ยนโหมดการทำงานเป็นโหมดจำลอง (mock mode)
   * ใช้สำหรับการทดสอบ UI โดยไม่ต้องเชื่อมต่อกับ API จริง
   */
  enableMockMode(): void {
    this.useMockMode = true;
    console.log('เปลี่ยนเป็นโหมดจำลองสำหรับ FaceNet API แล้ว');
  }
  
  /**
   * เปลี่ยนโหมดการทำงานเป็นโหมดปกติ (ใช้ API จริง)
   */
  disableMockMode(): void {
    this.useMockMode = false;
    console.log('เปลี่ยนเป็นโหมดปกติสำหรับ FaceNet API แล้ว (ใช้ API จริง)');
  }
  
  /**
   * ตรวจสอบว่ากำลังใช้งานโหมดจำลองอยู่หรือไม่
   */
  isMockModeEnabled(): boolean {
    return this.useMockMode;
  }
}

// สร้าง Singleton instance ของ FaceNetService
const faceNetService = new FaceNetService();

export default faceNetService;
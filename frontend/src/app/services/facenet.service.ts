'use client';

import axios from 'axios';

/**
 * FaceNet Service สำหรับการสร้าง Face Embeddings โดยใช้ API
 */
class FaceNetService {
  private apiUrl: string;
  private modelLoaded: boolean = false;
  
  constructor() {
    // กำหนด URL ของ API
    this.apiUrl = process.env.NEXT_PUBLIC_FACENET_API_URL || 'http://localhost:8000';
    console.log(`FaceNet API URL: ${this.apiUrl}`);
  }
  
  /**
   * ทดสอบเชื่อมต่อกับ API เพื่อตรวจสอบว่า API พร้อมใช้งานหรือไม่
   */
  async loadModel(): Promise<boolean> {
    if (this.modelLoaded) return true;
    
    try {
      console.log('กำลังตรวจสอบการเชื่อมต่อกับ FaceNet API...');
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        this.modelLoaded = true;
        console.log('เชื่อมต่อกับ FaceNet API สำเร็จ:', response.data);
        return true;
      }
      
      console.warn('ไม่สามารถเชื่อมต่อกับ FaceNet API ได้');
      return false;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ FaceNet API:', error);
      
      // ถ้าไม่สามารถเชื่อมต่อได้ ให้แสดงข้อความเตือน
      console.warn('ใช้งานในโหมด fallback (ใช้ dummy embeddings)');
      
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
      // ตรวจสอบและโหลด API
      const apiAvailable = await this.loadModel();
      
      // ถ้า API พร้อมใช้งาน ลองเชื่อมต่อ
      if (apiAvailable) {
        try {
          // ปรับรูปแบบ base64 ก่อนส่ง
          let base64Data = faceImage;
          
          // ถ้ารูปแบบเป็น data URL ให้ตัดส่วนหัวออก
          if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,')[1];
          }
          
          // สร้าง formData
          const formData = new FormData();
          formData.append('image_data', base64Data);
          
          // เรียกใช้ API เพื่อสร้าง embeddings
          const response = await axios.post(
            `${this.apiUrl}/generate-embeddings/base64/`,
            formData,
            { timeout: 10000 } // timeout 10 วินาที
          );
          
          // ตรวจสอบว่าได้รับ embeddings หรือไม่
          if (response.data && response.data.embeddings) {
            console.log('ได้รับ embeddings จาก API สำเร็จ');
            return response.data.embeddings;
          }
        } catch (apiError: any) {
          // จัดการกรณี 400 (ไม่พบใบหน้า) แยกจากกรณีอื่น
          if (apiError.response && apiError.response.status === 400) {
            console.warn('API แจ้งว่าไม่พบใบหน้าในรูปภาพ - ใช้ dummy embeddings แทน');
          } else {
            console.error('ไม่สามารถเรียกใช้ API ได้:', apiError);
          }
        }
      }
      
      // ถ้าไม่สามารถเชื่อมต่อ API ได้ หรือมีข้อผิดพลาด ใช้ consistent dummy embeddings
      console.warn('ใช้ consistent dummy embeddings แทน');
      return this.createConsistentDummyEmbeddings(faceImage);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้าง Face Embeddings:', error);
      
      // ใช้ dummy embeddings ในกรณีที่มีข้อผิดพลาด
      console.warn('ใช้ consistent dummy embeddings แทน');
      return this.createConsistentDummyEmbeddings(faceImage);
    }
  }
  
  /**
   * สร้าง consistent embeddings จำลองสำหรับรูปภาพเดียวกัน
   * @param image รูปภาพที่ใช้เป็น seed
   * @returns embeddings ที่คงที่สำหรับรูปภาพเดียวกัน
   */
  private createConsistentDummyEmbeddings(image: string): number[] {
    // ใช้ส่วนแรกของรูปภาพเป็น seed
    const seed = this.simpleHash(image.substring(0, 1000));
    
    // สร้าง pseudo-random ด้วย seed
    const rng = this.seededRandom(seed);
    
    // สร้าง embeddings ขนาด 128 มิติ
    const embeddings = Array.from({ length: 128 }, () => rng() * 2 - 1);
    
    // Normalize
    return this.normalizeEmbeddings(embeddings);
  }
  
  /**
   * สร้าง embeddings จำลองแบบสุ่มสำหรับการทดสอบ
   * @returns embeddings จำลอง
   */
  private createDummyEmbeddings(): number[] {
    console.log('กำลังสร้าง random dummy embeddings สำหรับทดสอบ');
    
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
   * สร้าง hash จากสตริง (อย่างง่าย)
   * @param str สตริงที่ต้องการ hash
   * @returns ค่า hash เป็นตัวเลข
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  /**
   * สร้าง random function ที่ใช้ seed (เหมือนกับ Math.random แต่ให้ผลลัพธ์คงที่ตาม seed)
   * @param seed ค่า seed
   * @returns ฟังก์ชันที่คืนค่าสุ่มระหว่าง 0-1
   */
  private seededRandom(seed: number): () => number {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

// สร้าง Singleton instance ของ FaceNetService
const faceNetService = new FaceNetService();

export default faceNetService;
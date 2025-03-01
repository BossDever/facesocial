// src/app/utils/faceNetService.ts
import * as tf from '@tensorflow/tfjs';

export class FaceNetService {
  private model: tf.GraphModel | null = null;
  private modelPath = '/models/facenet/model.json'; // ตำแหน่งที่เก็บโมเดลที่แปลงแล้ว

  // โหลดโมเดล FaceNet
  async loadModel(): Promise<tf.GraphModel> {
    if (this.model) {
      return this.model;
    }

    console.log('กำลังโหลดโมเดล FaceNet...');
    try {
      this.model = await tf.loadGraphModel(this.modelPath);
      console.log('โหลดโมเดล FaceNet สำเร็จ');
      
      // Warmup model
      const dummyInput = tf.zeros([1, 160, 160, 3]);
      const result = this.model.predict(dummyInput) as tf.Tensor;
      result.dispose();
      dummyInput.dispose();
      
      return this.model;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดโมเดล FaceNet:', error);
      throw error;
    }
  }

  // แปลงรูปภาพเป็น tensor input สำหรับ FaceNet
  async preprocessImage(imgElement: HTMLImageElement): Promise<tf.Tensor> {
    return tf.tidy(() => {
      // 1. แปลงรูปภาพเป็น tensor
      let tensor = tf.browser.fromPixels(imgElement);
      
      // 2. ปรับขนาดเป็น 160x160 (ตามที่ FaceNet ต้องการ)
      tensor = tf.image.resizeBilinear(tensor, [160, 160]);
      
      // 3. Normalize ข้อมูลภาพ (0-255) เป็น (-1 to 1)
      tensor = tensor.toFloat().div(tf.scalar(255));
      tensor = tensor.mul(tf.scalar(2)).sub(tf.scalar(1));
      
      // 4. เพิ่มมิติ batch
      tensor = tensor.expandDims(0);
      
      return tensor;
    });
  }

  // สร้าง face embedding จากรูปภาพ
  async generateEmbedding(imgElement: HTMLImageElement): Promise<Float32Array> {
    try {
      // โหลดโมเดลถ้ายังไม่ได้โหลด
      await this.loadModel();
      
      // ประมวลผลรูปภาพ
      const tensor = await this.preprocessImage(imgElement);
      
      // ส่งเข้าโมเดลเพื่อสร้าง embedding
      const prediction = this.model!.predict(tensor) as tf.Tensor;
      
      // แปลงผลลัพธ์เป็น Float32Array
      const embedding = await prediction.data() as Float32Array;
      
      // ทำความสะอาดหน่วยความจำ
      tensor.dispose();
      prediction.dispose();
      
      return embedding;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้าง face embedding:', error);
      throw error;
    }
  }

  // คำนวณระยะห่างระหว่าง embeddings (Euclidean distance)
  calculateDistance(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings ต้องมีขนาดเท่ากัน');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // เปรียบเทียบว่าเป็นคนเดียวกันหรือไม่
  isSamePerson(embedding1: Float32Array, embedding2: Float32Array, threshold = 0.6): boolean {
    const distance = this.calculateDistance(embedding1, embedding2);
    return distance < threshold;
  }
}

export default new FaceNetService();
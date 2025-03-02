// เพิ่มไฟล์ใหม่ frontend\src\app\hooks\useTensorflowStatus.ts

'use client';

import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

export function useTensorflowStatus() {
  const [backendName, setBackendName] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkTensorflow() {
      try {
        setIsLoading(true);
        setError(null);

        // แสดงรายชื่อ backends ที่ลงทะเบียน
        console.log('Available TF backends:', Object.keys(tf.engine().registryFactory));

        // ทดสอบว่า TensorFlow พร้อมใช้งานหรือไม่
        await tf.ready();
        
        // ดูว่ากำลังใช้ backend อะไร
        const currentBackend = tf.getBackend();
        console.log('Current TensorFlow backend:', currentBackend);
        
        // ทดสอบสร้าง tensor
        const testTensor = tf.tensor1d([1, 2, 3, 4]);
        testTensor.dispose();
        
        setBackendName(currentBackend || null);
        setIsAvailable(true);
      } catch (err) {
        console.error('TensorFlow check error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkTensorflow();
  }, []);

  return { backendName, isAvailable, isLoading, error };
}
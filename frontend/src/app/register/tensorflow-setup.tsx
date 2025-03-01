'use client';

import React, { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
// นำเข้า backend ที่จำเป็นโดยตรง
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

export default function TensorflowSetup({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendName, setBackendName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const setupTensorflow = async () => {
      try {
        console.log("เริ่มการโหลด TensorFlow.js");
        console.log("Available backends:", Object.keys(tf.engine().registryFactory));
        
        // ตรวจสอบว่ามี backend อะไรบ้างที่สามารถใช้ได้
        if (!tf.findBackend('webgl') && !tf.findBackend('cpu')) {
          // ลงทะเบียน backend ใหม่ถ้าไม่มี
          console.log("No backends found, registering WebGL and CPU");
          // ไม่ต้องใช้ await tf.registerBackend เพราะจะมี import ด้านบนแล้ว
        }
        
        // กำหนด backend ตามลำดับความสำคัญ: WebGL (GPU) ก่อน, ถ้าไม่มีจึงใช้ CPU
        try {
          console.log("ทดสอบการใช้ WebGL backend");
          await tf.setBackend('webgl');
          console.log("ใช้ WebGL backend สำเร็จ");
        } catch (webglErr) {
          console.error("WebGL backend ไม่สำเร็จ, กำลังลองใช้ CPU:", webglErr);
          try {
            await tf.setBackend('cpu');
            console.log("ใช้ CPU backend สำเร็จ");
          } catch (cpuErr) {
            throw new Error(`ไม่สามารถกำหนด backend ได้: ${cpuErr}`);
          }
        }
        
        // ตรวจสอบว่าเราสามารถใช้ backend ได้จริง
        await tf.ready();
        const currentBackend = tf.getBackend();
        console.log('TensorFlow.js โหลดสำเร็จด้วย backend:', currentBackend);
        
        // ทดสอบสร้าง tensor เล็กๆ เพื่อยืนยันว่าระบบทำงานได้
        const testTensor = tf.tensor1d([1, 2, 3, 4]);
        console.log('Test tensor shape:', testTensor.shape);
        testTensor.dispose(); // ทำความสะอาดหน่วยความจำ
        
        setBackendName(currentBackend);
        setIsLoaded(true);
      } catch (err) {
        console.error('ไม่สามารถโหลด TensorFlow.js:', err);
        setError(`ไม่สามารถโหลด TensorFlow.js ได้: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    setupTensorflow();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-md">
          <h3 className="text-red-600 dark:text-red-400 text-lg font-medium mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            ลองรีเฟรชหน้านี้หรือใช้เบราว์เซอร์รุ่นใหม่ที่รองรับ WebGL
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังโหลดระบบตรวจจับใบหน้า...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {backendName && (
        <div className="fixed bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded z-50">
          TensorFlow: {backendName}
        </div>
      )}
      {children}
    </>
  );
}

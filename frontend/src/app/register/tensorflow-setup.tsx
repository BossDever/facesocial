'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface TensorflowSetupProps {
  children: ReactNode;
}

const TensorflowSetup: React.FC<TensorflowSetupProps> = ({ children }) => {
  const [isTfLoaded, setIsTfLoaded] = useState(false);
  const [isBackendLoaded, setIsBackendLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTensorflow = async () => {
      try {
        // ลองโหลด tfjs และ backends
        console.log('กำลังโหลด TensorFlow.js...');
        
        // ลอง import ทุก backend ที่ต้องการเพื่อให้แน่ใจว่าจะมีอย่างน้อย 1 backend ที่ใช้งานได้
        try {
          const tf = await import('@tensorflow/tfjs');
          console.log('โหลด TensorFlow.js core สำเร็จ');
          setIsTfLoaded(true);
          
          // โหลด backends ทั้งหมดที่มี
          try {
            // ลองโหลด WebGL backend ก่อน (ใช้ GPU)
            await import('@tensorflow/tfjs-backend-webgl');
            console.log('โหลด WebGL backend สำเร็จ');
            
            // ตั้งค่า backend เป็น webgl
            await tf.setBackend('webgl');
            console.log('ตั้งค่า backend เป็น webgl สำเร็จ');
            setIsBackendLoaded(true);
          } catch (webglError) {
            console.warn('ไม่สามารถโหลด WebGL backend ได้:', webglError);
            
            try {
              // ถ้า WebGL ไม่ทำงาน ลองใช้ CPU backend
              await import('@tensorflow/tfjs-backend-cpu');
              console.log('โหลด CPU backend สำเร็จ');
              
              // ตั้งค่า backend เป็น cpu
              await tf.setBackend('cpu');
              console.log('ตั้งค่า backend เป็น cpu สำเร็จ');
              setIsBackendLoaded(true);
            } catch (cpuError) {
              console.error('ไม่สามารถโหลด CPU backend ได้:', cpuError);
              throw new Error('ไม่สามารถโหลด TensorFlow backends ได้');
            }
          }
          
          // เช็คว่า backend พร้อมใช้งานหรือไม่
          const backend = tf.getBackend();
          console.log('กำลังใช้ backend:', backend);
          
          // ตรวจสอบว่า backend ทำงานได้ถูกต้อง
          try {
            // สร้าง tensor เล็กๆ เพื่อทดสอบ
            const testTensor = tf.tensor2d([[1, 2], [3, 4]]);
            console.log('สร้าง tensor ทดสอบสำเร็จ:', testTensor.shape);
            testTensor.dispose(); // คืนทรัพยากร
          } catch (testError) {
            console.error('เกิดข้อผิดพลาดในการทดสอบ tensor:', testError);
            throw new Error('ไม่สามารถสร้าง tensor ทดสอบได้');
          }
        } catch (tfError) {
          console.error('เกิดข้อผิดพลาดในการโหลด TensorFlow libraries:', tfError);
          
          // สร้าง mock tf global เพื่อหลีกเลี่ยงข้อผิดพลาด
          if (typeof window !== 'undefined') {
            // @ts-ignore
            window.tf = {
              getBackend: () => 'mock',
              setBackend: () => Promise.resolve(true),
              ready: () => Promise.resolve(true),
              tensor: () => ({ shape: [1], dispose: () => {} }),
              tensor2d: () => ({ shape: [2, 2], dispose: () => {} })
            };
            console.warn('สร้าง mock TensorFlow เพื่อหลีกเลี่ยงข้อผิดพลาด');
          }
          
          setError('ไม่สามารถโหลด TensorFlow.js ได้ ฟีเจอร์บางอย่างอาจไม่ทำงาน');
          setIsTfLoaded(true);
          setIsBackendLoaded(true);
        }
      } catch (error: any) {
        console.error('เกิดข้อผิดพลาดในการโหลด TensorFlow:', error);
        setError(`ไม่สามารถโหลด TensorFlow.js ได้: ${error.message}`);
        
        // ให้แอพทำงานต่อได้แม้จะไม่มี TensorFlow
        setIsTfLoaded(true);
        setIsBackendLoaded(true);
      }
    };
    
    // โหลด TensorFlow เมื่อคอมโพเนนต์ mount
    loadTensorflow();
  }, []);

  // ถ้ายังโหลดไม่เสร็จ แสดง loading
  if (!isTfLoaded || !isBackendLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังเตรียมระบบ TensorFlow...</p>
        </div>
      </div>
    );
  }

  // ถ้ามีข้อผิดพลาด แสดงข้อความแต่ยังให้แอพทำงานต่อได้
  if (error) {
    console.warn('TensorFlow.js error, continuing with limited functionality:', error);
    // ไม่ต้องแสดงข้อความ error ให้ผู้ใช้เห็น เพื่อให้แอพทำงานต่อได้
  }

  // แสดงเนื้อหาปกติ
  return <>{children}</>;
};

export default TensorflowSetup;
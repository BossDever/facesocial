'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
// Explicitly import backends
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

interface TensorflowSetupProps {
  children: ReactNode;
}

const TensorflowSetup: React.FC<TensorflowSetupProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string | null>(null);
  const [gpuInfo, setGpuInfo] = useState<string | null>(null);
  
  useEffect(() => {
    async function setupTensorflow() {
      try {
        console.log('Available TF backends:', Object.keys(tf.engine().registryFactory));
        
        // ทำให้แน่ใจว่าโหลด backend ทั้งหมดที่จำเป็น
        await Promise.all([
          import('@tensorflow/tfjs-backend-webgl'),
          import('@tensorflow/tfjs-backend-cpu')
        ]);
        
        // พยายามตั้งค่า WebGL เพื่อใช้งาน GPU
        try {
          // ตั้งค่า WebGL ให้ใช้งาน GPU อย่างเต็มที่
          await tf.setBackend('webgl');
          
          // ตั้งค่าเพื่อปรับปรุงประสิทธิภาพ
          if (tf.env().getFlags().HAS_WEBGL) {
            tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
            tf.env().set('WEBGL_PACK', true);
            tf.env().set('WEBGL_PACK_BINARY_OPERATIONS', true);
            tf.env().set('WEBGL_PACK_UNARY_OPERATIONS', true);
            tf.env().set('WEBGL_CHECK_NUMERICAL_PROBLEMS', false);
            
            // ตั้งค่า precision (precision ต่ำจะเร็วขึ้นแต่แม่นยำน้อยลง)
            tf.webgl.forceHalfFloat(true);
            
            console.log('ตั้งค่า WebGL สำเร็จ');
            
            // ดึงข้อมูล GPU
            const gl = tf.backend().getGPGPUContext().gl;
            const gpuVendor = gl.getParameter(gl.VENDOR);
            const gpuRenderer = gl.getParameter(gl.RENDERER);
            
            setGpuInfo(`${gpuVendor} - ${gpuRenderer}`);
            console.log('GPU information:', gpuVendor, gpuRenderer);
          } else {
            console.warn('WebGL ไม่พร้อมใช้งาน จะใช้ CPU แทน');
          }
        } catch (webglError) {
          console.warn('WebGL backend ล้มเหลว, ใช้ CPU backend แทน:', webglError);
          
          // ใช้ CPU backend ถ้า WebGL ล้มเหลว
          await tf.setBackend('cpu');
        }
        
        // เริ่มการทำงานของ TensorFlow.js
        await tf.ready();
        console.log('TensorFlow ready, backend:', tf.getBackend());
        
        // ทดสอบด้วยการคำนวณง่ายๆ
        const testTensor = tf.tensor1d([1, 2, 3, 4]);
        const result = testTensor.square();
        
        console.log('ทดสอบการคำนวณ:');
        console.log('Input:', [1, 2, 3, 4]);
        console.log('Output:', await result.data());
        
        // Cleanup
        testTensor.dispose();
        result.dispose();
        
        setBackend(tf.getBackend() || null);
        setIsReady(true);
      } catch (error) {
        console.error('TensorFlow setup error:', error);
        setError(error instanceof Error ? error.message : 'Unknown TensorFlow error');
        
        // พยายามใช้ CPU backend ถ้า WebGL ล้มเหลว
        try {
          await tf.setBackend('cpu');
          await tf.ready();
          setBackend('cpu');
          setIsReady(true);
        } catch (cpuError) {
          setError('ไม่สามารถเริ่มต้น TensorFlow ได้ทั้ง GPU และ CPU');
        }
      }
    }
    
    setupTensorflow();
  }, []);
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-red-50 dark:bg-red-900/30 rounded-lg max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            ไม่สามารถใช้งาน TensorFlow ได้
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            อาจเกิดจากเบราว์เซอร์ไม่รองรับ WebGL หรือ ไม่สามารถใช้งาน CPU backends ได้
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังเตรียมระบบ TensorFlow...</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            {backend ? `กำลังใช้ backend: ${backend}` : 'กำลังเลือก backend...'}
          </p>
        </div>
      </div>
    );
  }
  
  // แสดงข้อมูล TensorFlow ในโหมด Development
  const showDebugInfo = process.env.NODE_ENV === 'development';
  
  return (
    <>
      {children}
      
      {/* แสดงข้อมูล debug ในโหมด development */}
      {showDebugInfo && (
        <div className="fixed bottom-0 left-0 bg-black bg-opacity-75 text-white text-xs p-2 m-2 rounded z-50">
          TensorFlow.js: {backend} 
          {gpuInfo && <> | GPU: {gpuInfo}</>}
        </div>
      )}
    </>
  );
};

export default TensorflowSetup;
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
  
  useEffect(() => {
    async function setupTensorflow() {
      try {
        console.log('Available TF backends:', Object.keys(tf.engine().registryFactory));
        
        // Try WebGL first (GPU acceleration)
        try {
          await tf.setBackend('webgl');
          console.log('Using WebGL backend');
          setBackend('webgl');
        } catch (webglError) {
          console.warn('WebGL backend failed, falling back to CPU:', webglError);
          
          // Try CPU backend
          try {
            await tf.setBackend('cpu');
            console.log('Using CPU backend');
            setBackend('cpu');
          } catch (cpuError) {
            console.error('CPU backend also failed:', cpuError);
            throw new Error('No TensorFlow backend available');
          }
        }
        
        // Wait for TensorFlow to initialize
        await tf.ready();
        console.log('TensorFlow ready, backend:', tf.getBackend());
        
        // Test with a simple operation
        const testTensor = tf.tensor1d([1, 2, 3]);
        testTensor.dispose();
        
        setIsReady(true);
      } catch (error) {
        console.error('TensorFlow setup error:', error);
        setError(error instanceof Error ? error.message : 'Unknown TensorFlow error');
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
            อาจเกิดจากเบราว์เซอร์ไม่รองรับ WebGL หรือ CPU backends
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
          <p className="text-gray-700 dark:text-gray-300">กำลังโหลด TensorFlow ({backend || 'initializing'})...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default TensorflowSetup;
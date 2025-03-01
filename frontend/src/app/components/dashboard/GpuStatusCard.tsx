'use client';

import React, { useState, useEffect } from 'react';

interface GpuStatusCardProps {
  backendName: string | null;
  isAvailable: boolean;
}

const GpuStatusCard: React.FC<GpuStatusCardProps> = ({
  backendName,
  isAvailable
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString());
  }, []);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-800 dark:text-gray-200">
          TensorFlow Backend
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isAvailable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isAvailable ? 'กำลังใช้งาน' : 'ไม่พร้อมใช้งาน'}
        </span>
      </div>
      
      <div className="mt-2 flex items-center">
        <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-green-500"></div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Backend: <span className="font-medium">{backendName || 'ไม่ทราบ'}</span>
        </p>
      </div>
      
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {backendName === 'webgl' 
          ? 'กำลังใช้งาน GPU Acceleration (WebGL)'
          : backendName === 'cpu'
          ? 'กำลังใช้งาน CPU'
          : 'กำลังตรวจสอบ...'}
      </p>
      
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        ตรวจสอบล่าสุด: {currentTime}
      </p>
    </div>
  );
};

export default GpuStatusCard;
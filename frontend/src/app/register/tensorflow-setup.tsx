'use client';

import React, { ReactNode } from 'react';

interface TensorflowSetupProps {
  children: ReactNode;
}

// เปลี่ยนเป็น dummy component ที่ไม่ต้องโหลด TensorFlow ใดๆ
const TensorflowSetup: React.FC<TensorflowSetupProps> = ({ children }) => {
  // แสดงเนื้อหาปกติโดยไม่ต้องโหลด TensorFlow
  return <>{children}</>;
};

export default TensorflowSetup;
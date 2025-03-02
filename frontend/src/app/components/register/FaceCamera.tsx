'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Button from '../ui/button';

interface FaceCameraProps {
  onCapture: (imageSrc: string) => void;
}

const FaceCamera: React.FC<FaceCameraProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleStartCamera = () => {
    setIsCameraActive(true);
  };

  const captureImage = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        onCapture(imageSrc);
        setIsCameraActive(false);
      }
    }
  }, [onCapture]);

  return (
    <div className="w-full">
      {isCameraActive ? (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              mirrored
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "user"
              }}
              className="w-full h-auto"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <Button 
                onClick={captureImage} 
                variant="primary"
                className="shadow-lg"
              >
                ถ่ายภาพ
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>คำแนะนำ:</p>
            <ul className="list-disc pl-5">
              <li>ให้แน่ใจว่าใบหน้าของคุณอยู่ในกรอบและมองเห็นได้ชัดเจน</li>
              <li>หลีกเลี่ยงพื้นที่ที่มีแสงน้อยหรือแสงจ้าด้านหลัง</li>
              <li>ถอดแว่นตาหรืออุปกรณ์ที่บดบังใบหน้า</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          <Button onClick={handleStartCamera} variant="primary">
            เปิดกล้อง
          </Button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">หรืออัปโหลดรูปภาพจากอุปกรณ์ของคุณ</p>
        </div>
      )}
    </div>
  );
};

export default FaceCamera;
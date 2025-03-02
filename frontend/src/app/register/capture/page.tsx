'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Webcam from 'react-webcam';
import Button from '../../components/ui/button';
import ThemeToggle from '../../components/theme/ThemeToggle';
import TensorflowSetup from '../tensorflow-setup';
import * as blazeface from '@tensorflow-models/blazeface';

export default function CapturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = searchParams.get('return') || '/register';

  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScore, setFaceScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>(''); 
  
  // ตำแหน่งกรอบใบหน้า (ใช้ CSS แทน Canvas)
  const [faceBox, setFaceBox] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    visible: false
  });

  // โหลดโมเดล BlazeFace
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log("กำลังโหลดโมเดล BlazeFace...");
        const blazeFaceModel = await blazeface.load();
        console.log("โหลดโมเดล BlazeFace สำเร็จ");
        setModel(blazeFaceModel);
        setIsLoading(false);
      } catch (error) {
        console.error('ไม่สามารถโหลดโมเดลตรวจจับใบหน้าได้:', error);
        setCameraError('ไม่สามารถโหลดโมเดลตรวจจับใบหน้าได้ กรุณารีเฟรชหน้าเว็บ');
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  // ตรวจสอบกล้อง
  useEffect(() => {
    const checkCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (error) {
        console.error('ไม่สามารถเข้าถึงกล้องได้:', error);
        setCameraError('ไม่สามารถเข้าถึงกล้องได้ โปรดตรวจสอบการอนุญาตกล้อง');
        setIsLoading(false);
      }
    };

    checkCamera();
  }, []);

  // ตรวจจับใบหน้าจริงด้วย BlazeFace
  useEffect(() => {
    if (model && !isLoading && !cameraError && webcamRef.current && !capturedImage) {
      let animationFrameId: number;
  
      const detectFace = async () => {
        if (
          webcamRef.current &&
          webcamRef.current.video &&
          webcamRef.current.video.readyState === 4
        ) {
          const video = webcamRef.current.video;
          
          try {
            // ตรวจจับใบหน้าด้วย BlazeFace
            const predictions = await model.estimateFaces(video, false);
  
            if (predictions.length > 0) {
              // มีใบหน้าที่ตรวจพบ
              setFaceDetected(true);
  
              // คำนวณคะแนนความมั่นใจ (0-100)
              const score = predictions[0].probability[0] * 100;
              setFaceScore(score);
  
              // ดึงค่าพิกัดใบหน้า
              const start = predictions[0].topLeft as [number, number];
              const end = predictions[0].bottomRight as [number, number];
              const size = [end[0] - start[0], end[1] - start[1]];
  
              // บันทึกข้อมูล debug
              setDebugInfo(`พบใบหน้า: [${start[0].toFixed(0)}, ${start[1].toFixed(0)}] ถึง [${end[0].toFixed(0)}, ${end[1].toFixed(0)}], ขนาด: ${size[0].toFixed(0)}x${size[1].toFixed(0)}`);
              
              // ตรวจสอบความถูกต้อง
              const isValidFace = size[0] > 50 && size[1] > 50 && 
                                size[0] < video.videoWidth * 0.9 && 
                                size[1] < video.videoHeight * 0.9 &&
                                start[0] >= 0 && start[1] >= 0;
              
              if (isValidFace) {
                // คำนวณสัดส่วนระหว่างวิดีโอและการแสดงผล
                const videoElement = webcamRef.current.video;
                const videoWidth = videoElement.videoWidth;
                const videoHeight = videoElement.videoHeight;
                const displayWidth = videoElement.clientWidth;
                const displayHeight = videoElement.clientHeight;
                
                // อัตราส่วนการย่อ/ขยาย
                const scaleX = displayWidth / videoWidth;
                const scaleY = displayHeight / videoHeight;
                
                // พลิกพิกัดซ้าย-ขวา เนื่องจากวิดีโอถูกพลิกแบบกระจก (mirrored)
                const mirroredStart = videoWidth - end[0]; // พลิกตำแหน่งเริ่มต้น (ซ้าย)
                
                // ปรับพิกัดตามอัตราส่วน
                const padding = 10;
                const adjustedLeft = mirroredStart * scaleX; 
                const adjustedTop = start[1] * scaleY;
                const adjustedWidth = size[0] * scaleX;
                const adjustedHeight = size[1] * scaleY;
                
                // อัปเดตตำแหน่งกรอบใบหน้า
                setFaceBox({
                  top: adjustedTop - padding,
                  left: adjustedLeft - padding,
                  width: adjustedWidth + (padding * 2),
                  height: adjustedHeight + (padding * 2),
                  visible: true
                });
                
                console.log('Face box position:', {
                  video: { width: videoWidth, height: videoHeight },
                  display: { width: displayWidth, height: displayHeight },
                  scale: { x: scaleX, y: scaleY },
                  original: { start: start[0], end: end[0], width: size[0] },
                  mirrored: { start: mirroredStart, width: size[0] },
                  adjusted: { left: adjustedLeft, top: adjustedTop, width: adjustedWidth, height: adjustedHeight }
                });
              } else {
                console.warn('ตรวจพบใบหน้าที่ไม่ถูกต้อง:', { start, end, size });
                setFaceBox(prev => ({...prev, visible: false}));
              }
            } else {
              // ไม่พบใบหน้า
              setFaceDetected(false);
              setFaceScore(0);
              setDebugInfo('ไม่พบใบหน้า');
              setFaceBox(prev => ({...prev, visible: false}));
            }
          } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตรวจจับใบหน้า:', error);
            setDebugInfo(`เกิดข้อผิดพลาด: ${error}`);
          }
        }
  
        animationFrameId = requestAnimationFrame(detectFace);
      };
  
      detectFace();
  
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [model, isLoading, cameraError, capturedImage]);

  // ถ่ายภาพ
  const captureImage = () => {
    if (webcamRef.current && faceDetected && faceScore > 60) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
      setFaceBox(prev => ({...prev, visible: false}));
    }
  };

  // ลบภาพที่ถ่ายและถ่ายใหม่
  const retakeImage = () => {
    setCapturedImage(null);
  };

  // บันทึกภาพและกลับไปหน้าลงทะเบียน
  const saveImage = () => {
    if (capturedImage) {
      // บันทึกภาพลงใน localStorage
      const existingImages = JSON.parse(localStorage.getItem('faceImages') || '[]');
      existingImages.push(capturedImage);
      localStorage.setItem('faceImages', JSON.stringify(existingImages));

      // กลับไปหน้าลงทะเบียน
      router.push(returnPath);
    }
  };

  // คำนวณสีตามคะแนน
  const getBorderColor = () => {
    if (faceScore > 80) return 'border-green-500';
    if (faceScore > 60) return 'border-yellow-500';
    return 'border-red-500';
  };

  // คำนวณสีของข้อความตามคะแนน
  const getTextColor = () => {
    if (faceScore > 80) return 'text-green-400';
    if (faceScore > 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // ปุ่มสลับโหมดการพลิกภาพ
  const [isMirrored, setIsMirrored] = useState(true);
  const toggleMirror = () => {
    setIsMirrored(!isMirrored);
  };

  return (
    <TensorflowSetup>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push(returnPath)}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200"
          >
            &larr; กลับ
          </button>
          <h1 className="text-xl font-bold text-center text-gray-900 dark:text-white">ถ่ายภาพใบหน้า</h1>
          <div className="flex space-x-2">
            <button 
              onClick={toggleMirror}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded text-gray-700 dark:text-gray-200"
              title="สลับมุมมองซ้าย-ขวา"
            >
              {isMirrored ? 'ปิดพลิกภาพ' : 'เปิดพลิกภาพ'}
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300">กำลังโหลดระบบตรวจจับใบหน้า...</p>
            </div>
          ) : cameraError ? (
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-red-500 mx-auto mb-4"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 
                  1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 
                  1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                ไม่สามารถเข้าถึงกล้องได้
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {cameraError}
              </p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                ลองใหม่
              </Button>
            </div>
          ) : capturedImage ? (
            <div className="w-full space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="ภาพที่ถ่าย"
                  className="w-full h-auto"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">คุณภาพภาพ</h3>
                <div className="mb-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                      คะแนนใบหน้า: {Math.round(faceScore)}%
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className={`
                          h-2 rounded-full ${
                            faceScore > 80 ? 'bg-green-500' :
                            faceScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`
                        }
                        style={{ width: `${faceScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {faceScore > 80 ? (
                    <p className="text-green-600 dark:text-green-400">คุณภาพดีเยี่ยม สามารถใช้งานได้</p>
                  ) : faceScore > 60 ? (
                    <p className="text-yellow-600 dark:text-yellow-400">คุณภาพพอใช้ได้ แต่แนะนำให้ถ่ายใหม่ในที่ที่มีแสงดีกว่า</p>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">คุณภาพไม่ดี กรุณาถ่ายใหม่ในที่ที่มีแสงสว่างเพียงพอ</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={retakeImage}>
                  ถ่ายใหม่
                </Button>
                <Button
                  onClick={saveImage}
                  disabled={faceScore < 60}
                >
                  ใช้ภาพนี้
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  mirrored={isMirrored}
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                  }}
                  className="w-full h-auto"
                />
                
                {/* กรอบใบหน้าแบบ CSS (แทน Canvas) */}
                {faceBox.visible && (
                  <div 
                    className={`absolute border-4 ${getBorderColor()} z-10`}
                    style={{
                      top: `${faceBox.top}px`,
                      left: `${faceBox.left}px`,
                      width: `${faceBox.width}px`,
                      height: `${faceBox.height}px`,
                      boxShadow: '0 0 0 4px rgba(0, 0, 0, 0.5)'
                    }}
                  />
                )}
                
                {/* พื้นหลังทึบแสงเมื่อไม่พบใบหน้า */}
                {!faceDetected && (
                  <div className="absolute top-0 left-0 right-0 bottom-0 bg-red-500 bg-opacity-20 flex flex-col items-center justify-center z-20">
                    <div className="bg-black bg-opacity-70 text-white px-6 py-4 rounded-lg">
                      <h3 className="text-xl font-bold mb-2">ไม่พบใบหน้า</h3>
                      <p>กรุณาปรับตำแหน่งใบหน้าให้อยู่ในกรอบ</p>
                    </div>
                  </div>
                )}
                
                <div className="absolute top-4 left-4 z-30 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                  {faceDetected ? (
                    <span className={getTextColor()}>
                      ตรวจพบใบหน้า ({Math.round(faceScore)}%)
                    </span>
                  ) : (
                    <span className="text-red-400">ไม่พบใบหน้า</span>
                  )}
                </div>
                
                {/* แสดงข้อมูล debug */}
                {debugInfo && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs z-30">
                    {debugInfo}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">คำแนะนำ</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                  <li>จัดให้ใบหน้าอยู่ตรงกลางกรอบและมองเห็นได้ชัดเจน</li>
                  <li>ถ่ายในที่ที่มีแสงสว่างเพียงพอ หลีกเลี่ยงแสงจ้าด้านหลัง</li>
                  <li>ถอดแว่นตาหรืออุปกรณ์ที่บดบังใบหน้า</li>
                  <li>มองตรงกล้อง ไม่ยิ้มหรือแสดงอารมณ์</li>
                </ul>
              </div>

              <Button
                onClick={captureImage}
                disabled={!faceDetected || faceScore < 60}
                className="w-full"
              >
                {!faceDetected ? 'รอตรวจจับใบหน้า...' :
                  faceScore < 60 ? 'คุณภาพใบหน้าต่ำเกินไป' : 'ถ่ายภาพ'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </TensorflowSetup>
  );
}
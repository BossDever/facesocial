'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Webcam from 'react-webcam';
import Button from '../../components/ui/button';
import ThemeToggle from '../../components/theme/ThemeToggle';
import apiService from '../../services/api.service';
import faceNetService from '../../services/facenet.service';

export default function FaceLoginPage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScore, setFaceScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  // ตำแหน่งกรอบใบหน้า (ใช้ CSS แทน Canvas)
  const [faceBox, setFaceBox] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    visible: false
  });

  // ตรวจสอบการล็อกอินเมื่อโหลดหน้า
  useEffect(() => {
    // ตรวจสอบว่ามี token แล้วหรือไม่
    if (apiService.hasAuthToken()) {
      // ถ้ามี token อยู่แล้ว ให้นำไปยังหน้า feed
      router.push('/feed');
    } else {
      // โหลดโมเดล FaceNet
      loadFaceNetModel();
      
      // ตรวจสอบกล้อง
      checkCamera();
    }
  }, [router]);

  // โหลดโมเดล FaceNet
  const loadFaceNetModel = async () => {
    try {
      setIsLoading(true);
      const loaded = await faceNetService.loadModel();
      setIsModelLoaded(loaded);
      
      if (loaded) {
        console.log('โหลดโมเดล FaceNet สำเร็จ');
      } else {
        console.warn('ไม่สามารถโหลดโมเดล FaceNet ได้ จะใช้โหมดจำลองแทน');
        faceNetService.enableMockMode();
        setIsModelLoaded(true);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดโมเดล FaceNet:', error);
      faceNetService.enableMockMode();
      setIsModelLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ตรวจสอบกล้อง
  const checkCamera = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setIsLoading(false);
    } catch (error) {
      console.error('ไม่สามารถเข้าถึงกล้องได้:', error);
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ โปรดตรวจสอบการอนุญาตกล้อง');
      setIsLoading(false);
    }
  };

  // เริ่มตรวจจับใบหน้า
  useEffect(() => {
    // ตรวจสอบว่าโมเดลโหลดเสร็จแล้ว
    if (!isModelLoaded || cameraError) return;
    
    const detectInterval = setInterval(async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        // จับภาพจากกล้อง
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          try {
            // ส่งรูปไปตรวจจับใบหน้าที่ server
            const result = await faceNetService.detectFaces(imageSrc);
            
            if (result.faceDetected) {
              setFaceDetected(true);
              setFaceScore(result.score);
              
              // คำนวณตำแหน่งกรอบใบหน้า
              if (webcamRef.current && webcamRef.current.video) {
                const video = webcamRef.current.video;
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                const displayWidth = video.clientWidth;
                const displayHeight = video.clientHeight;
                
                // อัตราส่วนระหว่างวิดีโอจริงและการแสดงผล
                const widthRatio = displayWidth / videoWidth;
                const heightRatio = displayHeight / videoHeight;
                
                // ถ้ามีข้อมูล faceBox จาก API
                if (result.faceBox) {
                  // อัปเดตตำแหน่งกรอบใบหน้า
                  setFaceBox({
                    top: result.faceBox.top * heightRatio,
                    left: result.faceBox.left * widthRatio,
                    width: result.faceBox.width * widthRatio,
                    height: result.faceBox.height * heightRatio,
                    visible: true
                  });
                } else {
                  // ข้อมูลจำลอง
                  setFaceBox({
                    top: 100,
                    left: 100,
                    width: 200,
                    height: 200,
                    visible: true
                  });
                }
              }
            } else {
              setFaceDetected(false);
              setFaceScore(0);
              setFaceBox(prev => ({...prev, visible: false}));
            }
          } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตรวจจับใบหน้า:', error);
            setFaceDetected(false);
            setFaceScore(0);
            setFaceBox(prev => ({...prev, visible: false}));
          }
        }
      }
    }, 500); // ทุก 500ms
    
    // ยกเลิก interval เมื่อคอมโพเนนต์ถูกทำลาย
    return () => clearInterval(detectInterval);
  }, [isModelLoaded, cameraError]);

  // ทำการเข้าสู่ระบบด้วยใบหน้า
  const handleFaceLogin = async () => {
    if (!webcamRef.current || !faceDetected || faceScore < 60) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      setMessage(null);
      
      // จับภาพใบหน้า
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        setError('ไม่สามารถจับภาพจากกล้องได้ กรุณาลองอีกครั้ง');
        setIsProcessing(false);
        return;
      }
      
      // สร้าง face embeddings ผ่าน API
      console.log('กำลังสร้าง embeddings จากรูปภาพ');
      const embeddings = await faceNetService.generateEmbeddings(imageSrc);
      
      // ส่งข้อมูลไปยัง API เพื่อเข้าสู่ระบบ
      console.log('กำลังส่งข้อมูลไปยัง API เพื่อเข้าสู่ระบบด้วยใบหน้า');
      
      try {
        const response = await apiService.loginWithFace({
          embeddings,
          imageBase64: imageSrc
        });
        
        // ตรวจสอบผลลัพธ์
        if (response && response.token) {
          // เข้าสู่ระบบสำเร็จ
          setMessage('เข้าสู่ระบบสำเร็จ กำลังนำคุณไปยังหน้าฟีด...');
          
          // เปลี่ยนเส้นทางหลังจากเข้าสู่ระบบสำเร็จ
          setTimeout(() => {
            router.push('/feed');
          }, 1500);
        } else {
          // เข้าสู่ระบบไม่สำเร็จ
          setError('เข้าสู่ระบบไม่สำเร็จ ไม่พบข้อมูลผู้ใช้หรือใบหน้าไม่ตรงกัน');
        }
      } catch (apiError: any) {
        // จัดการข้อผิดพลาดจาก API
        console.error('Face login API error:', apiError);
        
        // ตรวจสอบประเภทข้อผิดพลาด
        if (apiError.response && apiError.response.status === 401) {
          setError('ไม่พบข้อมูลผู้ใช้หรือใบหน้าไม่ตรงกับในระบบ');
        } else if (apiError.response && apiError.response.data && apiError.response.data.message) {
          setError(apiError.response.data.message);
        } else {
          // การจัดการข้อผิดพลาดทั่วไป
          setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วยใบหน้า กรุณาลองอีกครั้ง');
          
          // ถ้าอยู่ในโหมดพัฒนา (Development) ให้จำลองการเข้าสู่ระบบ
          if (process.env.NODE_ENV === 'development') {
            setMessage('(โหมดทดสอบ) เข้าสู่ระบบสำเร็จ กำลังนำคุณไปยังหน้าฟีด...');
            
            // จำลองการเข้าสู่ระบบด้วย dummy token
            apiService.setAuthToken('dummy_token_for_testing');
            
            // เปลี่ยนเส้นทางหลังจากเข้าสู่ระบบสำเร็จ
            setTimeout(() => {
              router.push('/feed');
            }, 1500);
          }
        }
      }
    } catch (error) {
      console.error('Face login error:', error);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วยใบหน้า กรุณาลองอีกครั้ง');
    } finally {
      setIsProcessing(false);
    }
  };

  // ปุ่มสลับโหมดการพลิกภาพ
  const toggleMirror = () => {
    setIsMirrored(!isMirrored);
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push('/login')}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200"
        >
          &larr; กลับไปหน้าเข้าสู่ระบบ
        </button>
        <h1 className="text-xl font-bold text-center text-gray-900 dark:text-white">เข้าสู่ระบบด้วยใบหน้า</h1>
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
            <p className="text-gray-700 dark:text-gray-300">กำลังเตรียมระบบ...</p>
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
        ) : (
          <div className="w-full space-y-4">
            {message && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                <span className="block sm:inline">{message}</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
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
              
              {/* กรอบใบหน้าแบบ CSS */}
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
              
              {/* แสดงข้อมูลโหมดจำลอง */}
              {faceNetService.isMockModeEnabled() && (
                <div className="absolute top-4 right-4 z-30 bg-yellow-500 bg-opacity-80 text-white px-2 py-1 rounded text-xs">
                  โหมดจำลอง
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">คำแนะนำ</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                <li>จัดให้ใบหน้าอยู่ตรงกลางกรอบและมองเห็นได้ชัดเจน</li>
                <li>ถ่ายในที่ที่มีแสงสว่างเพียงพอ หลีกเลี่ยงแสงจ้าด้านหลัง</li>
                <li>มองตรงกล้อง ไม่ยิ้มหรือแสดงอารมณ์</li>
                <li>ใบหน้าควรอยู่ในตำแหน่งเดียวกับที่ใช้ลงทะเบียน</li>
              </ul>
            </div>

            <Button
              onClick={handleFaceLogin}
              disabled={!faceDetected || faceScore < 60 || isProcessing}
              isLoading={isProcessing}
              className="w-full"
            >
              {!faceDetected ? 'รอตรวจจับใบหน้า...' :
                faceScore < 60 ? 'คุณภาพใบหน้าต่ำเกินไป' : 'เข้าสู่ระบบด้วยใบหน้า'}
            </Button>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  ยังไม่มีบัญชี? สมัครสมาชิก
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* แสดงข้อมูล debug ในโหมด development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          TensorFlow.js: {faceNetService.getTensorFlowBackend() || 'ไม่พร้อมใช้งาน'} | 
          GPU: {faceNetService.isUsingGPU() ? 'ใช้งาน' : 'ไม่ใช้งาน'} |
          Mode: {faceNetService.isMockModeEnabled() ? 'จำลอง' : 'ปกติ'}
        </div>
      )}
    </div>
  );
}
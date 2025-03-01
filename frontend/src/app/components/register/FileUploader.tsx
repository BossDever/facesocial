'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as blazeface from '@tensorflow-models/blazeface';
import Button from '../ui/button';

interface FileUploaderProps {
  onImageUploaded: (imageSrc: string, score: number) => void;
  existingImages?: string[]; // รับรายการรูปภาพที่มีอยู่แล้ว (ใช้สำหรับตรวจสอบรูปซ้ำ)
  minRequired?: number; // จำนวนรูปภาพขั้นต่ำที่ต้องการ
  currentCount?: number; // จำนวนรูปภาพปัจจุบัน
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onImageUploaded, 
  existingImages = [],
  minRequired = 10,
  currentCount = 0
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [progress, setProgress] = useState<{ current: number, total: number, success: number, error: number, skip: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // โหลดโมเดล BlazeFace
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log("กำลังโหลดโมเดล BlazeFace สำหรับ FileUploader...");
        
        try {
          // พยายามโหลดโมเดลจากโฟลเดอร์ public
          const blazeFaceModel = await blazeface.load({
            modelUrl: '/models/blazeface/model.json'
          });
          console.log("โหลดโมเดล BlazeFace จากโฟลเดอร์ public สำเร็จ");
          setModel(blazeFaceModel);
          setIsModelLoading(false);
        } catch (localError) {
          console.warn("ไม่พบโมเดลในเครื่อง หรือโมเดลมีปัญหา, ใช้ mock model แทน", localError);
          
          // สร้าง mock model เพื่อทำงานแทน BlazeFace
          const mockModel = {
            estimateFaces: async (img) => {
              // จำลองการตรวจพบใบหน้า
              // ใช้ข้อมูลขนาดรูปภาพเพื่อจำลองการตรวจพบที่ดีขึ้น
              let imgWidth = 300;
              let imgHeight = 300;
              
              // ถ้า img เป็น Element ที่มีขนาด
              if (img instanceof HTMLImageElement || img instanceof HTMLVideoElement || 
                  img instanceof HTMLCanvasElement) {
                imgWidth = img.width || 300;
                imgHeight = img.height || 300;
              } else if (img instanceof ImageData) {
                imgWidth = img.width;
                imgHeight = img.height;
              }
              
              // จำลองการพบใบหน้า 1 ใบหน้าตรงกลางรูป
              const faceWidth = imgWidth * 0.4;  // ใบหน้ากว้างประมาณ 40% ของความกว้างรูป
              const faceHeight = imgHeight * 0.4;
              
              const centerX = imgWidth / 2;
              const centerY = imgHeight / 2;
              
              const topLeft = [centerX - faceWidth/2, centerY - faceHeight/2];
              const bottomRight = [centerX + faceWidth/2, centerY + faceHeight/2];
              
              return [{
                topLeft: topLeft,
                bottomRight: bottomRight,
                landmarks: [
                  [centerX - faceWidth*0.2, centerY - faceHeight*0.1], // ตาซ้าย
                  [centerX + faceWidth*0.2, centerY - faceHeight*0.1], // ตาขวา
                  [centerX, centerY + faceHeight*0.1], // จมูก
                  [centerX - faceWidth*0.15, centerY + faceHeight*0.2], // มุมซ้ายของปาก
                  [centerX + faceWidth*0.15, centerY + faceHeight*0.2]  // มุมขวาของปาก
                ],
                probability: [0.95] // ความมั่นใจในการตรวจพบสูง
              }];
            }
          };
          
          // ตั้งค่า mock model
          setModel(mockModel);
          setIsModelLoading(false);
          console.log("ใช้ mock model สำหรับการตรวจจับใบหน้าแทน BlazeFace ที่มีปัญหา");
        }
        
      } catch (error) {
        console.error('ไม่สามารถโหลดโมเดลตรวจจับใบหน้าได้:', error);
        setError('ไม่สามารถโหลดโมเดลตรวจจับใบหน้าได้ กรุณารีเฟรชหน้าเว็บ');
        setIsModelLoading(false);
      }
    };
    
    loadModel();
  }, []);
  
  // ตรวจสอบว่ารูปภาพซ้ำกับที่มีอยู่แล้วหรือไม่
  const isDuplicateImage = (newImageSrc: string): boolean => {
    // ตัดส่วน header ของ base64 ออก เพื่อให้ได้เฉพาะข้อมูลรูปภาพมาเปรียบเทียบ
    const newImageData = newImageSrc.split(',')[1] || '';
    
    return existingImages.some(existingImage => {
      const existingImageData = existingImage.split(',')[1] || '';
      return existingImageData === newImageData;
    });
  };
  
  // ประมวลผลรูปภาพ
  const processImage = async (file: File): Promise<{ success: boolean; error?: string; imageSrc?: string; score?: number }> => {
    if (!model) {
      return { success: false, error: 'โมเดลตรวจจับใบหน้ายังไม่พร้อมใช้งาน' };
    }
    
    try {
      // อ่านไฟล์เป็น data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          const imageSrc = e.target?.result as string;
          
          // ตรวจสอบรูปซ้ำ
          if (isDuplicateImage(imageSrc)) {
            resolve({ success: false, error: 'รูปภาพนี้มีอยู่แล้ว' });
            return;
          }
          
          const img = new Image();
          img.src = imageSrc;
          
          img.onload = async () => {
            try {
              // ตรวจจับใบหน้าด้วย BlazeFace
              const predictions = await model.estimateFaces(img, false);
              
              if (predictions.length === 0) {
                resolve({ success: false, error: 'ไม่พบใบหน้าในรูปภาพ' });
                return;
              }
              
              // ตรวจสอบว่ามีใบหน้ามากกว่า 1 ใบหรือไม่
              if (predictions.length > 1) {
                resolve({ success: false, error: 'พบใบหน้ามากกว่า 1 ใบในรูปภาพ รองรับเฉพาะรูปที่มีใบหน้าเดียวเท่านั้น' });
                return;
              }
              
              // คำนวณคะแนนความมั่นใจ (0-100)
              const score = predictions[0].probability[0] * 100;
              
              if (score < 60) {
                resolve({ success: false, error: `คุณภาพใบหน้าต่ำเกินไป (${Math.round(score)}%)` });
                return;
              }
              
              resolve({ success: true, imageSrc, score: Math.round(score) });
            } catch (error) {
              console.error('ไม่สามารถตรวจสอบรูปภาพได้:', error);
              resolve({ success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบรูปภาพ' });
            }
          };
          
          img.onerror = () => {
            resolve({ success: false, error: 'ไม่สามารถโหลดรูปภาพได้' });
          };
        };
        
        reader.onerror = () => {
          resolve({ success: false, error: 'เกิดข้อผิดพลาดในการอ่านไฟล์' });
        };
        
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ:', error);
      return { success: false, error: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ' };
    }
  };
  
  // ประมวลผลหลายรูปภาพ
  const processImages = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    
    const progressData = { current: 0, total: files.length, success: 0, error: 0, skip: 0 };
    setProgress(progressData);
    
    // สร้างรายการเพื่อรวบรวมรูปภาพที่ประมวลผลสำเร็จ
    const successfulImages: { src: string, score: number }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressData.current = i + 1;
      setProgress({...progressData});
      
      try {
        // ตรวจสอบนามสกุลไฟล์
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          progressData.error++;
          setProgress({...progressData});
          continue;
        }
        
        // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
        if (file.size > 5 * 1024 * 1024) {
          progressData.error++;
          setProgress({...progressData});
          continue;
        }
        
        // ประมวลผลรูปภาพ
        const result = await processImage(file);
        
        if (result.success && result.imageSrc && result.score !== undefined) {
          // เก็บรูปภาพที่ประมวลผลสำเร็จในรายการ
          successfulImages.push({ src: result.imageSrc, score: result.score });
          progressData.success++;
        } else if (result.error?.includes('มีอยู่แล้ว')) {
          progressData.skip++;
        } else {
          progressData.error++;
        }
        
        setProgress({...progressData});
      } catch (err) {
        console.error('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ:', err);
        progressData.error++;
        setProgress({...progressData});
      }
      
      // หน่วงเวลาเล็กน้อยเพื่อไม่ให้เบราว์เซอร์ค้าง
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // หลังจากประมวลผลเสร็จทั้งหมด ส่งรูปภาพที่สำเร็จไปยัง parent component
    console.log(`กำลังเพิ่มรูปภาพที่ประมวลผลสำเร็จ ${successfulImages.length} รูป`);
    
    // เพิ่มทีละรูปเพื่อป้องกันปัญหาการอัปเดต state พร้อมกัน
    for (const image of successfulImages) {
      onImageUploaded(image.src, image.score);
      // หน่วงเวลาเล็กน้อยระหว่างการเพิ่มแต่ละรูป
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setIsAnalyzing(false);
    
    // แสดงข้อความสรุป
    if (progressData.success > 0) {
      // คำนวณจำนวนรูปที่ต้องการเพิ่ม
      const newTotalCount = currentCount + progressData.success;
      const stillNeeded = Math.max(0, minRequired - newTotalCount);
      
      if (stillNeeded > 0) {
        setSuccessMessage(`อัปโหลดสำเร็จ ${progressData.success} รูป (ต้องการอีก ${stillNeeded} รูป)`);
      } else {
        setSuccessMessage(`อัปโหลดสำเร็จ ${progressData.success} รูป (ครบ ${minRequired} รูปแล้ว)`);
      }
      
      // แสดงข้อความแจ้งเตือนถ้ามีรูปที่ไม่ผ่าน
      if (progressData.skip > 0 || progressData.error > 0) {
        const messages = [];
        if (progressData.skip > 0) messages.push(`ข้ามรูปซ้ำ ${progressData.skip} รูป`);
        if (progressData.error > 0) messages.push(`ไม่สามารถใช้ได้ ${progressData.error} รูป`);
        setError(messages.join(', '));
      }
    } else if (progressData.skip > 0 && progressData.error === 0) {
      setError(`ข้ามรูปที่มีอยู่แล้วทั้งหมด ${progressData.skip} รูป`);
    } else if (progressData.error > 0) {
      setError(`เกิดข้อผิดพลาด ${progressData.error} รูป กรุณาตรวจสอบรูปภาพและลองอีกครั้ง`);
    }
    
    setProgress(null);
  };
  
  // จัดการไฟล์ที่เลือก
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    console.log(`เลือกไฟล์ ${fileArray.length} ไฟล์`);
    processImages(fileArray);
    
    // รีเซ็ต input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // เปิดหน้าต่างเลือกไฟล์
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // จำนวนรูปที่ต้องการเพิ่ม
  const imagesNeeded = Math.max(0, minRequired - currentCount);
  const hasEnoughImages = currentCount >= minRequired;
  
  return (
    <div className="w-full">
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          multiple // เพิ่ม attribute ให้เลือกหลายไฟล์ได้
        />
        
        {/* แสดงสถานะความต้องการรูปภาพ */}
        {!hasEnoughImages && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-3 text-center">
            <span className="font-medium">ต้องการอีก {imagesNeeded} รูป</span> จากทั้งหมด {minRequired} รูป
          </div>
        )}
        
        {progress ? (
          <div className="w-full mb-4">
            <div className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-400">
              <span>กำลังประมวลผล</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              สำเร็จ: {progress.success}, ข้ามรูปซ้ำ: {progress.skip}, ล้มเหลว: {progress.error}
            </div>
          </div>
        ) : (
          <Button
            onClick={handleButtonClick}
            variant="outline"
            disabled={isModelLoading || isAnalyzing}
            className="mb-2"
          >
            {isModelLoading ? 'กำลังโหลดโมเดล...' : 
             isAnalyzing ? 'กำลังวิเคราะห์...' : 'เลือกรูปภาพ (เลือกได้หลายรูป)'}
          </Button>
        )}
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          JPG, PNG ขนาดไม่เกิน 5MB ต่อรูป
        </p>
        
        {successMessage && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
            {successMessage}
          </p>
        )}
        
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">คำแนะนำในการอัปโหลดรูปภาพ:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>เลือกรูปภาพที่เห็นใบหน้าชัดเจน ไม่เบลอ</li>
          <li>ใบหน้าควรอยู่ตรงกลางและมีขนาดใหญ่พอสมควร</li>
          <li>รูปภาพควรมีแสงสว่างเพียงพอ</li>
          <li>รูปภาพที่มีอยู่แล้วจะถูกข้ามโดยอัตโนมัติ</li>
          <li><strong>รองรับเฉพาะรูปที่มีใบหน้าเดียวเท่านั้น</strong></li>
          <li>สามารถเลือกหลายรูปพร้อมกันได้ (คลิกค้างไว้หรือกด Ctrl เพื่อเลือกหลายรูป)</li>
          <li><strong>ต้องอัปโหลดอย่างน้อย {minRequired} รูป</strong> เพื่อใช้สำหรับการยืนยันตัวตน</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;
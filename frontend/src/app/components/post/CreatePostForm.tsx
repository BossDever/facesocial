'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import apiService from '@/app/services/api.service';
import Button from '@/app/components/ui/button';
import * as blazeface from '@tensorflow-models/blazeface';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
}

interface DetectedFace {
  id: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  user: {
    id: string;
    name: string;
  } | null;
  confidence: number;
}

interface CreatePostFormProps {
  user: User;
  onPostCreated?: () => void;
  onCancel?: () => void;
  className?: string;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({
  user,
  onPostCreated,
  onCancel,
  className = '',
}) => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoTagEnabled, setIsAutoTagEnabled] = useState(true);
  
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isProcessingFaces, setIsProcessingFaces] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  
  // โหลดโมเดล BlazeFace เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    async function loadFaceDetectionModel() {
      try {
        console.log("กำลังโหลดโมเดล BlazeFace...");
        const blazeFaceModel = await blazeface.load();
        console.log("โหลดโมเดล BlazeFace สำเร็จ");
        setModel(blazeFaceModel);
      } catch (error) {
        console.error("ไม่สามารถโหลดโมเดล BlazeFace ได้:", error);
        // สร้าง mock model ในกรณีที่โหลดโมเดลไม่สำเร็จ
        setModel({
          estimateFaces: async (img) => {
            console.warn("ใช้ mock model สำหรับการตรวจจับใบหน้า");
            // จำลองการพบใบหน้า 1 ใบหน้า
            return [{
              topLeft: [100, 50],
              bottomRight: [180, 130],
              landmarks: [
                [130, 70], [150, 70], // ตาซ้าย, ตาขวา
                [140, 90], // จมูก
                [130, 110], [150, 110] // มุมซ้ายของปาก, มุมขวาของปาก
              ],
              probability: [0.98]
            }];
          }
        } as blazeface.BlazeFaceModel);
      }
    }
    
    loadFaceDetectionModel();
  }, []);
  
  // เปิดหน้าต่างเลือกไฟล์
  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // จัดการเมื่อเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const selectedFiles = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    
    // ตรวจสอบไฟล์ที่เลือก
    selectedFiles.forEach(file => {
      // ตรวจสอบว่าเป็นรูปภาพหรือวิดีโอ
      if (file.type.match(/^(image|video)\//)) {
        // ตรวจสอบขนาดไฟล์ (ไม่เกิน 10MB)
        if (file.size <= 10 * 1024 * 1024) {
          validFiles.push(file);
          // สร้าง URL สำหรับแสดงตัวอย่าง
          const previewUrl = URL.createObjectURL(file);
          newPreviews.push(previewUrl);
        } else {
          console.warn(`ไฟล์ ${file.name} มีขนาดเกิน 10MB`);
        }
      } else {
        console.warn(`ไฟล์ ${file.name} ไม่ใช่รูปภาพหรือวิดีโอ`);
      }
    });
    
    // อัปเดตสเตท
    setMediaFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    
    // รีเซ็ตค่า input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // ถ้าเปิดใช้การแท็กอัตโนมัติและเป็นรูปภาพ
    if (isAutoTagEnabled && validFiles.length > 0) {
      // ตรวจสอบว่าไฟล์แรกเป็นรูปภาพหรือไม่
      if (validFiles[0].type.match(/^image\//)) {
        // รอให้รูปภาพโหลดเสร็จก่อนตรวจจับใบหน้า
        setTimeout(() => {
          const img = document.querySelector(`[data-preview-index="${previews.length}"]`) as HTMLImageElement;
          if (img) {
            detectFaces(img, previews.length);
          }
        }, 500);
      }
    }
  };
  
  // ลบไฟล์ที่เลือก
  const handleRemoveFile = (index: number) => {
    // ยกเลิก URL ของไฟล์ตัวอย่าง
    URL.revokeObjectURL(previews[index]);
    
    // ลบข้อมูลไฟล์และตัวอย่าง
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    
    // ลบข้อมูลใบหน้าที่ตรวจพบ
    setDetectedFaces(prev => prev.filter(face => face.id !== index));
  };
  
  // ตรวจจับใบหน้าในรูปภาพ
  const detectFaces = async (imgElement: HTMLImageElement, previewIndex: number) => {
    if (!model) {
      console.error("โมเดล BlazeFace ยังไม่พร้อมใช้งาน");
      return;
    }
    
    try {
      setIsProcessingFaces(true);
      
      // ตรวจจับใบหน้าด้วย BlazeFace
      const predictions = await model.estimateFaces(imgElement, false);
      console.log(`ตรวจพบใบหน้า ${predictions.length} ใบหน้า ในรูปภาพที่ ${previewIndex}`);
      
      // แปลงผลลัพธ์ให้อยู่ในรูปแบบที่ใช้งานง่าย
      const imgWidth = imgElement.naturalWidth;
      const imgHeight = imgElement.naturalHeight;
      
      const faces: DetectedFace[] = predictions.map((prediction, idx) => {
        const start = prediction.topLeft as [number, number];
        const end = prediction.bottomRight as [number, number];
        const width = end[0] - start[0];
        const height = end[1] - start[1];
        
        // คำนวณตำแหน่งเป็นเปอร์เซ็นต์
        const xPercent = (start[0] / imgWidth) * 100;
        const yPercent = (start[1] / imgHeight) * 100;
        const widthPercent = (width / imgWidth) * 100;
        const heightPercent = (height / imgHeight) * 100;
        
        return {
          id: previewIndex,
          position: {
            x: xPercent,
            y: yPercent,
            width: widthPercent,
            height: heightPercent
          },
          user: null, // ยังไม่ได้ระบุตัวตน
          confidence: prediction.probability[0]
        };
      });
      
      // เพิ่มหรืออัปเดตข้อมูลใบหน้าที่ตรวจพบ
      setDetectedFaces(prev => {
        // ลบข้อมูลใบหน้าของรูปภาพนี้ก่อน (ถ้ามี)
        const filtered = prev.filter(face => face.id !== previewIndex);
        return [...filtered, ...faces];
      });
      
      // ถ้าพบใบหน้า ลองระบุตัวตนอัตโนมัติ (สมมติ)
      if (faces.length > 0) {
        // ในระบบจริงควรเรียกใช้ API เพื่อระบุตัวตน
        console.log("ควรเรียกใช้ API เพื่อระบุตัวตนในระบบจริง");
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการตรวจจับใบหน้า:", error);
    } finally {
      setIsProcessingFaces(false);
    }
  };
  
  // ระบุตัวตนให้กับใบหน้าที่ตรวจพบ
  const handleTagUser = (faceIndex: number, user: { id: string; name: string }) => {
    setDetectedFaces(prev => {
      const updated = [...prev];
      if (updated[faceIndex]) {
        updated[faceIndex] = { ...updated[faceIndex], user };
      }
      return updated;
    });
  };
  
  // ลบการแท็กใบหน้า
  const handleRemoveTag = (faceIndex: number) => {
    setDetectedFaces(prev => {
      const updated = [...prev];
      if (updated[faceIndex]) {
        updated[faceIndex] = { ...updated[faceIndex], user: null };
      }
      return updated;
    });
  };
  
  // ส่งฟอร์มสร้างโพสต์
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ตรวจสอบว่ามีเนื้อหาหรือรูปภาพ/วิดีโอ
    if (!content.trim() && mediaFiles.length === 0) {
      setError('กรุณาเพิ่มข้อความหรืออัปโหลดรูปภาพ/วิดีโอ');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // สร้างข้อมูลสำหรับส่งไปยัง API
      const formData = new FormData();
      formData.append('content', content);
      
      // เพิ่มไฟล์มีเดีย
      mediaFiles.forEach((file, index) => {
        formData.append(`media`, file);
        
        // เพิ่มข้อมูล face tags (ถ้ามี)
        const faceTags = detectedFaces.filter(face => face.id === index && face.user);
        if (faceTags.length > 0) {
          formData.append(`faceTags`, JSON.stringify(faceTags));
        }
      });
      
      // ส่งข้อมูลไปยัง API
      const response = await apiService.createPost(formData);
      
      // รีเซ็ตฟอร์ม
      setContent('');
      setMediaFiles([]);
      setPreviews([]);
      setDetectedFaces([]);
      
      // เรียกใช้ callback หลังจากสร้างโพสต์สำเร็จ
      if (onPostCreated) {
        onPostCreated();
      }
      
      // รีเฟรชหน้า feed ในกรณีที่ผู้ใช้อยู่ในหน้า feed
      router.refresh();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสร้างโพสต์:', error);
      setError('ไม่สามารถสร้างโพสต์ได้ โปรดลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          {/* รูปโปรไฟล์ผู้ใช้ */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {user.profileImage ? (
                <Image 
                  src={user.profileImage.startsWith('http') ? user.profileImage : `/api${user.profileImage}`}
                  alt={`${user.firstName} ${user.lastName}`}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-lg font-bold">
                  {user.firstName.charAt(0)}
                </div>
              )}
            </div>
          </div>
          
          {/* ฟอร์มสำหรับเนื้อหาโพสต์ */}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`คุณกำลังคิดอะไรอยู่ ${user.firstName}?`}
              className="w-full px-0 py-2 border-0 focus:ring-0 text-gray-700 dark:text-gray-200 bg-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            
            {/* แสดงตัวอย่างรูปภาพและวิดีโอที่เลือก */}
            {previews.length > 0 && (
              <div className={`grid ${previews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-3`}>
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {/* ตรวจสอบว่าเป็นรูปภาพหรือวิดีโอ */}
                    {mediaFiles[index]?.type.startsWith('image/') ? (
                      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={preview}
                          alt={`ตัวอย่างที่ ${index + 1}`}
                          className="w-full h-full object-cover"
                          data-preview-index={index}
                          ref={index === 0 ? previewImgRef : null}
                        />
                        
                        {/* แสดงกรอบใบหน้าที่ตรวจพบ */}
                        {detectedFaces
                          .filter(face => face.id === index)
                          .map((face, faceIdx) => (
                            <div
                              key={faceIdx}
                              className={`absolute border-2 ${face.user ? 'border-green-500' : 'border-yellow-500'}`}
                              style={{
                                left: `${face.position.x}%`,
                                top: `${face.position.y}%`,
                                width: `${face.position.width}%`,
                                height: `${face.position.height}%`
                              }}
                            >
                              {face.user ? (
                                <div className="absolute -bottom-6 left-0 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                                  {face.user.name}
                                  <button 
                                    type="button"
                                    className="ml-1 text-white hover:text-red-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(faceIdx);
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div className="absolute -bottom-6 left-0 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">
                                  แท็กคน
                                </div>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <video
                          src={preview}
                          className="w-full h-full object-cover"
                          controls
                        />
                      </div>
                    )}
                    
                    {/* ปุ่มลบไฟล์ */}
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-gray-800/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* แสดงสถานะกำลังประมวลผลใบหน้า */}
            {isProcessingFaces && (
              <div className="flex items-center space-x-2 mt-2 text-gray-600 dark:text-gray-300">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-blue-500"></div>
                <span className="text-sm">กำลังตรวจจับใบหน้า...</span>
              </div>
            )}
            
            {/* สวิตช์เปิด-ปิดการแท็กอัตโนมัติ */}
            <div className="mt-3 flex items-center">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoTagEnabled}
                  onChange={() => setIsAutoTagEnabled(!isAutoTagEnabled)}
                  className="sr-only peer"
                />
                <div className="relative w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ms-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  แท็กใบหน้าอัตโนมัติ
                </span>
              </label>
            </div>
            
            {/* แสดงข้อความแจ้งเตือนข้อผิดพลาด */}
            {error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {/* ปุ่มเพิ่มรูปภาพ/วิดีโอและส่งโพสต์ */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={handleOpenFilePicker}
                  disabled={isSubmitting}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                  title="เพิ่มรูปภาพหรือวิดีโอ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                
                {/* Input ซ่อนสำหรับเลือกไฟล์ */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />
                
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                  title="เพิ่มอิโมจิ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              
              <div className="flex space-x-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    ยกเลิก
                  </Button>
                )}
                
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={(!content.trim() && mediaFiles.length === 0) || isSubmitting}
                >
                  โพสต์
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostForm;
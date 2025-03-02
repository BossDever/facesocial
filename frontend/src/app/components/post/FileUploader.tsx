'use client';

import React, { useState, useRef, useEffect } from 'react';
import apiService from '@/app/services/api.service';
import Button from '@/app/components/ui/button';

interface FileUploaderProps {
  onFilesUploaded: (files: File[], urls: string[]) => void;
  maxFiles?: number;
  maxSize?: number; // Size in MB
  acceptTypes?: string;
  multiple?: boolean;
  onUploadProgress?: (progress: number) => void;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesUploaded,
  maxFiles = 10,
  maxSize = 10, // 10 MB default limit
  acceptTypes = 'image/*,video/*',
  multiple = true,
  onUploadProgress,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // ล้างข้อมูลเมื่อคอมโพเนนต์ถูกทำลาย
  useEffect(() => {
    return () => {
      // ยกเลิก URL ของไฟล์ตัวอย่างทั้งหมด
      previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [previews]);
  
  // จัดการการลากไฟล์มาวาง
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  };
  
  // เปิดหน้าต่างเลือกไฟล์
  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // จัดการเมื่อเลือกไฟล์จาก input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    
    // รีเซ็ตค่า input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // ตรวจสอบและประมวลผลไฟล์
  const handleFiles = (files: File[]) => {
    setError(null);
    
    // ตรวจสอบจำนวนไฟล์
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`สามารถอัปโหลดได้สูงสุด ${maxFiles} ไฟล์เท่านั้น`);
      return;
    }
    
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    const errors: string[] = [];
    
    // ตรวจสอบไฟล์แต่ละไฟล์
    files.forEach(file => {
      // ตรวจสอบประเภทไฟล์
      const isAcceptedType = acceptTypes
        .split(',')
        .some(type => {
          const regex = new RegExp(type.replace('*', '.*'));
          return regex.test(file.type);
        });
      
      if (!isAcceptedType) {
        errors.push(`ไฟล์ ${file.name} ไม่ตรงกับประเภทที่รองรับ`);
        return;
      }
      
      // ตรวจสอบขนาดไฟล์
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`ไฟล์ ${file.name} มีขนาดเกิน ${maxSize} MB`);
        return;
      }
      
      // ไฟล์ผ่านการตรวจสอบ
      validFiles.push(file);
      
      // สร้าง URL สำหรับแสดงตัวอย่าง
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      } else {
        // สำหรับไฟล์ประเภทอื่นๆ ใช้ไอคอนแทน
        newPreviews.push('');
      }
    });
    
    // แสดงข้อผิดพลาด (ถ้ามี)
    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
    
    // อัปเดตสเตท
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };
  
  // ลบไฟล์ที่เลือก
  const handleRemoveFile = (index: number) => {
    // ยกเลิก URL ของไฟล์ตัวอย่าง
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }
    
    // ลบข้อมูลไฟล์และตัวอย่าง
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  // อัปโหลดไฟล์ไปยังเซิร์ฟเวอร์
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');
      return;
    }
    
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // สร้าง FormData
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // ใช้ axios interceptor หรือ event listener เพื่อติดตามความคืบหน้า
      // (ในตัวอย่างนี้ จำลองความคืบหน้า)
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 10;
          progress = Math.min(progress, 99); // ไม่ให้ถึง 100 จนกว่าจะสำเร็จ
          
          setUploadProgress(progress);
          if (onUploadProgress) {
            onUploadProgress(progress);
          }
          
          if (progress >= 99) {
            clearInterval(interval);
          }
        }, 300);
        
        return interval;
      };
      
      const progressInterval = simulateProgress();
      
      // ใช้ API ในการอัปโหลด
      // ในตัวอย่างนี้ จำลองการอัปโหลดเพื่อการสาธิต
      // ในระบบจริง ควรใช้ apiService.uploadFiles(formData)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (onUploadProgress) {
        onUploadProgress(100);
      }
      
      // จำลองการได้รับ URL จากเซิร์ฟเวอร์
      const uploadedUrls = selectedFiles.map((_, i) => `/uploads/sample_${i + 1}.jpg`);
      
      // เรียกใช้ callback เพื่อส่งข้อมูลไฟล์ที่อัปโหลดแล้ว
      onFilesUploaded(selectedFiles, uploadedUrls);
      
      // รีเซ็ตฟอร์ม
      setSelectedFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์:', error);
      setError('ไม่สามารถอัปโหลดไฟล์ได้ โปรดลองอีกครั้ง');
    } finally {
      setIsUploading(false);
    }
  };
  
  // สร้างข้อความตัวอย่าง
  const renderDropzoneText = () => {
    if (selectedFiles.length > 0) {
      return `เลือกไฟล์แล้ว ${selectedFiles.length} ไฟล์`;
    }
    
    return (
      <>
        <span className="text-blue-500">เลือกไฟล์</span> หรือลากไฟล์มาวางที่นี่
      </>
    );
  };
  
  // ข้อความแสดงไฟล์ที่รองรับ
  const fileTypeText = () => {
    if (acceptTypes === 'image/*') {
      return 'รองรับไฟล์รูปภาพทั้งหมด';
    } else if (acceptTypes === 'video/*') {
      return 'รองรับไฟล์วิดีโอทั้งหมด';
    } else if (acceptTypes === 'image/*,video/*') {
      return 'รองรับไฟล์รูปภาพและวิดีโอ';
    } else {
      return `รองรับ: ${acceptTypes}`;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* พื้นที่สำหรับลากและวางไฟล์ */}
      <div
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleOpenFilePicker}
      >
        <div className="flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="text-gray-700 dark:text-gray-300 mb-1">
            {renderDropzoneText()}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {fileTypeText()} (ขนาดสูงสุด {maxSize} MB ต่อไฟล์, สูงสุด {maxFiles} ไฟล์)
          </p>
        </div>
      </div>
      
      {/* input สำหรับเลือกไฟล์ (ซ่อนไว้) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {/* แสดงข้อความแจ้งเตือนข้อผิดพลาด */}
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
          {error.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
      
      {/* แสดงตัวอย่างไฟล์ที่เลือก */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ไฟล์ที่เลือก ({selectedFiles.length})
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                {/* แสดงตัวอย่างตามประเภทไฟล์ */}
                {file.type.startsWith('image/') ? (
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img 
                      src={previews[index]} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : file.type.startsWith('video/') ? (
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <video 
                      src={previews[index]} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white bg-gray-800/50 rounded-full p-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                
                {/* ชื่อไฟล์ */}
                <div className="mt-1 text-xs truncate text-gray-600 dark:text-gray-400">
                  {file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name}
                </div>
                
                {/* ปุ่มลบ */}
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* แสดงแถบความคืบหน้า */}
      {isUploading && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>กำลังอัปโหลด...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* ปุ่มอัปโหลด */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            variant="primary"
            className="w-full sm:w-auto"
          >
            อัปโหลด ({selectedFiles.length} ไฟล์)
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
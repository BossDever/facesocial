'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import ThemeToggle from '../../components/theme/ThemeToggle';
import apiService from '../../services/api.service';
import * as blazeface from '@tensorflow-models/blazeface';
import faceNetService from '../../services/facenet.service';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstTime = searchParams.get('first_time') === 'true';
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    email: '',
    job: '',
    department: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // สถานะสำหรับการจัดการข้อมูลใบหน้า
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [faceImages, setFaceImages] = useState<any[]>([]);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScore, setFaceScore] = useState(0);
  
  // สถานะสำหรับการตั้งค่าระบบใบหน้า
  const [faceSettings, setFaceSettings] = useState({
    autoTagEnabled: true,
    faceLoginEnabled: true,
    attendanceEnabled: true,
    cctvEnabled: true,
    notifyOnDetection: true,
    notifyOnUnknownFace: true,
    shareTeamData: false
  });
  
  // สถานะสำหรับการตั้งค่าการแจ้งเตือน
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    loginAlerts: true,
    activityReports: true,
    weeklyReports: false
  });
  
  // โหลดโมเดล BlazeFace
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log("กำลังโหลดโมเดล BlazeFace...");
        const loadedModel = await blazeface.load();
        console.log("โหลดโมเดล BlazeFace สำเร็จ");
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error("ไม่สามารถโหลดโมเดล BlazeFace ได้:", error);
        setIsModelLoading(false);
      }
    };
    
    loadModel();
    
    // จำลองข้อมูลใบหน้า
    const mockFaceImages = [
      { id: 1, src: 'https://source.unsplash.com/random/150x150/?face&sig=1', score: 95, date: '2025-02-10', hasEmbeddings: true },
      { id: 2, src: 'https://source.unsplash.com/random/150x150/?face&sig=2', score: 92, date: '2025-02-10', hasEmbeddings: true },
      { id: 3, src: 'https://source.unsplash.com/random/150x150/?face&sig=3', score: 88, date: '2025-02-11', hasEmbeddings: true },
      { id: 4, src: 'https://source.unsplash.com/random/150x150/?face&sig=4', score: 97, date: '2025-02-12', hasEmbeddings: true },
      { id: 5, src: 'https://source.unsplash.com/random/150x150/?face&sig=5', score: 91, date: '2025-02-14', hasEmbeddings: true },
      { id: 6, src: 'https://source.unsplash.com/random/150x150/?face&sig=6', score: 89, date: '2025-02-15', hasEmbeddings: true },
      { id: 7, src: 'https://source.unsplash.com/random/150x150/?face&sig=7', score: 94, date: '2025-02-18', hasEmbeddings: true },
      { id: 8, src: 'https://source.unsplash.com/random/150x150/?face&sig=8', score: 96, date: '2025-02-20', hasEmbeddings: true },
    ];
    setFaceImages(mockFaceImages);
  }, []);
  
  // ตรวจสอบ auth และดึงข้อมูลผู้ใช้
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // ตรวจสอบว่ามี token หรือไม่
        if (!apiService.hasAuthToken()) {
          router.push('/login');
          return;
        }
        
        // ดึงข้อมูลจาก localStorage (ที่อาจบันทึกไว้จากหน้าตั้งค่าโปรไฟล์)
        const storedUserData = localStorage.getItem('userData');
        const userData = storedUserData ? JSON.parse(storedUserData) : null;
        
        if (userData) {
          setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            bio: userData.bio || '',
            email: userData.email || '',
            job: userData.job || '',
            department: userData.department || ''
          });
          
          setProfileImage(userData.profileImage || null);
        } else {
          // ถ้าไม่มีข้อมูลใน localStorage ใช้ข้อมูลจำลอง
          setFormData({
            firstName: '',
            lastName: '',
            bio: '',
            email: 'user@example.com',
            job: '',
            department: ''
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [router]);
  
  // จัดการการเปลี่ยนแปลงข้อมูลในฟอร์ม
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // ลบข้อผิดพลาดเมื่อผู้ใช้แก้ไขข้อมูล
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // ตรวจสอบความถูกต้องของข้อมูล
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'กรุณากรอกชื่อจริง';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'กรุณากรอกนามสกุล';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // ตรวจจับใบหน้าจากกล้อง
  const detectFaceFromCamera = useCallback(async () => {
    if (!model || !webcamRef.current || !webcamRef.current.video || 
        webcamRef.current.video.readyState !== 4) {
      return;
    }
    
    try {
      const video = webcamRef.current.video;
      const predictions = await model.estimateFaces(video, false);
      
      if (predictions.length > 0) {
        // มีใบหน้าที่ตรวจพบ
        setFaceDetected(true);
        
        // คำนวณคะแนนความมั่นใจ (0-100)
        const score = predictions[0].probability[0] * 100;
        setFaceScore(score);
      } else {
        // ไม่พบใบหน้า
        setFaceDetected(false);
        setFaceScore(0);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการตรวจจับใบหน้า:", error);
    }
  }, [model]);
  
  // ตรวจจับใบหน้าต่อเนื่อง
  useEffect(() => {
    let animationFrameId: number;
    
    if (isCameraActive && model && webcamRef.current) {
      const detectFaceContinuously = async () => {
        await detectFaceFromCamera();
        animationFrameId = requestAnimationFrame(detectFaceContinuously);
      };
      
      detectFaceContinuously();
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isCameraActive, model, detectFaceFromCamera]);
  
  // เปิดหน้าต่างเลือกไฟล์รูปภาพ
  const handleSelectImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // จัดการการเปลี่ยนไฟล์รูปภาพ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profileImage: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น' }));
      return;
    }
    
    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, profileImage: 'ขนาดไฟล์ต้องไม่เกิน 5MB' }));
      return;
    }
    
    // อ่านไฟล์เป็น Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setTempImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // ลบข้อผิดพลาดของรูปภาพ
    if (errors.profileImage) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.profileImage;
        return newErrors;
      });
    }
  };
  
  // ยืนยันการเปลี่ยนรูปภาพ
  const confirmImageChange = () => {
    if (tempImage) {
      setProfileImage(tempImage);
      setTempImage(null);
    }
  };
  
  // ยกเลิกการเปลี่ยนรูปภาพ
  const cancelImageChange = () => {
    setTempImage(null);
    
    // ล้างค่า file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // ลบรูปภาพ
  const removeProfileImage = () => {
    setProfileImage(null);
    setTempImage(null);
    
    // ล้างค่า file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // เปิด/ปิดกล้อง
  const toggleCamera = () => {
    setIsCameraActive(prev => !prev);
  };
  
  // จับภาพใบหน้า
  const captureFace = async () => {
    if (!webcamRef.current || !faceDetected || faceScore < 60) return;
    
    try {
      setIsCapturingFace(true);
      
      // จับภาพจากกล้อง
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        console.error("ไม่สามารถจับภาพจากกล้องได้");
        setIsCapturingFace(false);
        return;
      }
      
      // จำลองการสร้าง face embeddings
      try {
        // ในระบบจริงจะใช้ faceNetService.generateEmbeddings(imageSrc);
        console.log("กำลังสร้าง face embeddings...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // จำลองความล่าช้าในการประมวลผล
        
        // เพิ่มภาพใบหน้าในรายการ
        const newFaceImage = {
          id: faceImages.length + 1,
          src: imageSrc,
          score: Math.round(faceScore),
          date: new Date().toISOString().split('T')[0],
          hasEmbeddings: true
        };
        
        setFaceImages([newFaceImage, ...faceImages]);
        
        // แสดงข้อความสำเร็จ
        setSuccess("บันทึกข้อมูลใบหน้าสำเร็จ");
        setTimeout(() => setSuccess(null), 3000);
        
        // ปิดกล้อง
        setIsCameraActive(false);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสร้าง face embeddings:", error);
        setErrors(prev => ({ ...prev, face: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลใบหน้า' }));
      }
      
      setIsCapturingFace(false);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการจับภาพใบหน้า:", error);
      setIsCapturingFace(false);
    }
  };
  
  // ลบข้อมูลใบหน้า
  const deleteFaceImage = (id: number) => {
    setFaceImages(faceImages.filter(face => face.id !== id));
  };
  
  // บันทึกข้อมูลโปรไฟล์
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ตรวจสอบความถูกต้องของข้อมูล
    if (!validateForm()) return;
    
    setIsSaving(true);
    setSuccess(null);
    
    try {
      // จำลองการบันทึกข้อมูลไปยัง API
      // ในอนาคตจะใช้ apiService.updateUserProfile(formData)
      
      // จำลองการทำงานของ API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // บันทึกข้อมูลลง localStorage เพื่อการทดสอบ
      const userData = {
        ...formData,
        id: 'current-user',
        username: 'current_user',
        profileImage: profileImage
      };
      
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setSuccess('บันทึกข้อมูลโปรไฟล์เรียบร้อย');
      
      // ถ้าเป็นการตั้งค่าครั้งแรก ให้กลับไปยังหน้าฟีด
      if (isFirstTime) {
        // รอสักครู่เพื่อให้ผู้ใช้เห็นข้อความสำเร็จ
        setTimeout(() => {
          router.push('/feed');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors(prev => ({ ...prev, form: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง' }));
    } finally {
      setIsSaving(false);
    }
  };
  
  // บันทึกการตั้งค่าระบบใบหน้า
  const saveFaceSettings = async () => {
    setIsSaving(true);
    
    try {
      // จำลองการบันทึกข้อมูลไปยัง API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ในระบบจริงจะใช้ apiService.updateFaceSettings(faceSettings)
      console.log("บันทึกการตั้งค่าระบบใบหน้า:", faceSettings);
      
      setSuccess('บันทึกการตั้งค่าระบบใบหน้าเรียบร้อย');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving face settings:', error);
      setErrors(prev => ({ ...prev, faceSettings: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง' }));
    } finally {
      setIsSaving(false);
    }
  };
  
  // บันทึกการตั้งค่าการแจ้งเตือน
  const saveNotificationSettings = async () => {
    setIsSaving(true);
    
    try {
      // จำลองการบันทึกข้อมูลไปยัง API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ในระบบจริงจะใช้ apiService.updateNotificationSettings(notificationSettings)
      console.log("บันทึกการตั้งค่าการแจ้งเตือน:", notificationSettings);
      
      setSuccess('บันทึกการตั้งค่าการแจ้งเตือนเรียบร้อย');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setErrors(prev => ({ ...prev, notifications: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง' }));
    } finally {
      setIsSaving(false);
    }
  };
  
  // ฟังก์ชันช่วยสำหรับการเปลี่ยนแปลงการตั้งค่า toggle
  const handleToggleChange = (settingType: 'face' | 'notification', name: string, checked: boolean) => {
    if (settingType === 'face') {
      setFaceSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setNotificationSettings(prev => ({ ...prev, [name]: checked }));
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังโหลด...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              <Link href="/feed">FaceSocial</Link>
            </h1>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              
              {!isFirstTime && (
                <div className="flex items-center">
                  <Link href="/profile">
                    <Button variant="outline">กลับไปหน้าโปรไฟล์</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {isFirstTime ? 'ตั้งค่าโปรไฟล์ครั้งแรก' : 'แก้ไขโปรไฟล์'}
            </h2>
            
            {isFirstTime && (
              <div className="mb-6 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-4 rounded-md">
                <p>ยินดีต้อนรับสู่ FaceSocial! กรุณากรอกข้อมูลส่วนตัวและอัปโหลดรูปโปรไฟล์เพื่อเริ่มใช้งาน</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-4 rounded-md">
                <p>{success}</p>
              </div>
            )}
            
            {errors.form && (
              <div className="mb-6 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md">
                <p>{errors.form}</p>
              </div>
            )}
            
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex overflow-x-auto">
                <button 
                  className={`py-3 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'general' 
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('general')}
                >
                  ข้อมูลทั่วไป
                </button>
                <button 
                  className={`py-3 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'face-data' 
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('face-data')}
                >
                  ข้อมูลใบหน้า
                </button>
                <button 
                  className={`py-3 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'face-settings' 
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('face-settings')}
                >
                  ตั้งค่าระบบใบหน้า
                </button>
                <button 
                  className={`py-3 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'notifications' 
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('notifications')}
                >
                  การแจ้งเตือน
                </button>
              </div>
            </div>
            
            {/* General tab */}
            {activeTab === 'general' && (
              <form onSubmit={handleSubmit}>
                {/* Profile Image Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">รูปโปรไฟล์</h3>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Current profile image or preview */}
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0">
                      {tempImage ? (
                        <img 
                          src={tempImage} 
                          alt="Profile Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Image upload buttons */}
                    <div className="flex flex-col space-y-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {tempImage ? (
                        <div className="flex space-x-2">
                          <Button 
                            type="button" 
                            onClick={confirmImageChange} 
                            variant="primary"
                          >
                            ยืนยัน
                          </Button>
                          <Button 
                            type="button" 
                            onClick={cancelImageChange} 
                            variant="outline"
                          >
                            ยกเลิก
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          type="button" 
                          onClick={handleSelectImage} 
                          variant="outline"
                        >
                          {profileImage ? 'เปลี่ยนรูปโปรไฟล์' : 'อัปโหลดรูปโปรไฟล์'}
                        </Button>
                      )}
                      
                      {profileImage && !tempImage && (
                        <Button 
                          type="button" 
                          onClick={removeProfileImage} 
                          variant="secondary"
                        >
                          ลบรูปโปรไฟล์
                        </Button>
                      )}
                      
                      {errors.profileImage && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {errors.profileImage}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ขนาดไฟล์สูงสุด 5MB (แนะนำ: 300x300 พิกเซล)
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Personal Info Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">ข้อมูลส่วนตัว</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="ชื่อจริง *"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      error={errors.firstName}
                    />
                    
                    <Input
                      label="นามสกุล *"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      error={errors.lastName}
                    />
                    
                    <Input
                      label="อีเมล"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      error={errors.email}
                      disabled
                    />
                    
                    <Input
                      label="ตำแหน่งงาน"
                      name="job"
                      type="text"
                      value={formData.job}
                      onChange={handleInputChange}
                    />
                    
                    <Input
                      label="แผนก/ฝ่าย"
                      name="department"
                      type="text"
                      value={formData.department}
                      onChange={handleInputChange}
                    />
                    
                    <div className="sm:col-span-2">
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                        ข้อมูลเกี่ยวกับคุณ
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="เขียนอะไรเกี่ยวกับตัวคุณสักเล็กน้อย..."
                      />
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={isSaving}
                  >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </Button>
                </div>
              </form>
            )}
            
            {/* Face Data tab */}
            {activeTab === 'face-data' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">ข้อมูลใบหน้า</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    ระบบ FaceSocial ใช้ข้อมูลใบหน้าของคุณในการยืนยันตัวตน ตรวจจับใบหน้าในรูปภาพ และการเข้า-ออกสถานที่
                  </p>
                  
                  {/* Face data statistics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{faceImages.length}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">ใบหน้าที่บันทึกไว้</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                        {faceImages.length > 0 ? Math.round(faceImages.reduce((sum, face) => sum + face.score, 0) / faceImages.length) : 0}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">คะแนนเฉลี่ย</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                        {faceImages.filter(face => face.hasEmbeddings).length}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">มี Embeddings</div>
                    </div>
                  </div>
                  
                  {/* Add new face data */}
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                      เพิ่มข้อมูลใบหน้าใหม่
                    </h4>
                    {isCameraActive ? (
                      <div>
                        <div className="relative bg-black rounded-lg overflow-hidden mb-3">
                          {webcamRef?.current ? (
                            <>
                              <div 
                                className={`absolute w-full h-full flex items-center justify-center z-10 pointer-events-none ${
                                  faceDetected ? 'border-4 border-green-500' : 'border-4 border-red-500'
                                }`}
                              >
                                <div className={`text-sm px-2 py-1 rounded ${
                                  faceDetected 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {faceDetected 
                                    ? `ตรวจพบใบหน้า (${Math.round(faceScore)}%)` 
                                    : 'ไม่พบใบหน้า'}
                                </div>
                              </div>
                              
                              <div className="webcam-container">
                                {/* @ts-ignore */}
                                <Webcam
                                  audio={false}
                                  ref={webcamRef}
                                  screenshotFormat="image/jpeg"
                                  videoConstraints={{
                                    width: 640,
                                    height: 480,
                                    facingMode: "user"
                                  }}
                                  mirrored={true}
                                  className="w-full h-auto"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="h-64 flex items-center justify-center">
                              <p className="text-white">กำลังเริ่มกล้อง...</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={toggleCamera}
                          >
                            ปิดกล้อง
                          </Button>
                          
                          <Button 
                            type="button" 
                            variant={faceDetected && faceScore >= 60 ? "primary" : "outline"}
                            disabled={!faceDetected || faceScore < 60 || isCapturingFace}
                            isLoading={isCapturingFace}
                            onClick={captureFace}
                          >
                            {isCapturingFace ? 'กำลังบันทึก...' : 'บันทึกใบหน้า'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          คุณสามารถเพิ่มข้อมูลใบหน้าได้เพื่อเพิ่มความแม่นยำในการจดจำ
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={toggleCamera}
                          disabled={isModelLoading}
                        >
                          {isModelLoading ? 'กำลังโหลดโมเดล...' : 'เปิดกล้อง'}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Face images gallery */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                      รูปภาพใบหน้าที่บันทึกไว้
                    </h4>
                    
                    {faceImages.length === 0 ? (
                      <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400">ยังไม่มีข้อมูลใบหน้า</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {faceImages.map((face) => (
                          <div key={face.id} className="relative group">
                            <div className="aspect-square bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden">
                              <img 
                                src={face.src} 
                                alt={`Face data ${face.id}`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => deleteFaceImage(face.id)}
                                className="p-1 bg-red-500 rounded-full text-white"
                                title="ลบข้อมูลใบหน้า"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-white">{face.date}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  face.score >= 90 ? 'bg-green-500' :
                                  face.score >= 70 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                } text-white`}>
                                  {face.score}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {errors.face && (
                    <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                      {errors.face}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Face Settings tab */}
            {activeTab === 'face-settings' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">ตั้งค่าระบบใบหน้า</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    ปรับแต่งการใช้งานระบบจดจำใบหน้าให้เหมาะกับความต้องการของคุณ
                  </p>
                  
                  {errors.faceSettings && (
                    <div className="mb-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md">
                      <p>{errors.faceSettings}</p>
                    </div>
                  )}
                  
                  {/* Toggle switches for face settings */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">แท็กใบหน้าอัตโนมัติ</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          อนุญาตให้ระบบแท็กใบหน้าของคุณในรูปภาพโดยอัตโนมัติ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={faceSettings.autoTagEnabled} 
                          onChange={(e) => handleToggleChange('face', 'autoTagEnabled', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">เข้าสู่ระบบด้วยใบหน้า</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          อนุญาตให้ใช้ใบหน้าของคุณในการเข้าสู่ระบบ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={faceSettings.faceLoginEnabled} 
                          onChange={(e) => handleToggleChange('face', 'faceLoginEnabled', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">ระบบบันทึกเวลาทำงาน</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          อนุญาตให้ใช้ใบหน้าของคุณในการบันทึกเวลาเข้า-ออกงาน
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={faceSettings.attendanceEnabled} 
                          onChange={(e) => handleToggleChange('face', 'attendanceEnabled', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">ระบบกล้องวงจรปิด</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          อนุญาตให้ระบบกล้องวงจรปิดตรวจจับและจดจำใบหน้าของคุณ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={faceSettings.cctvEnabled} 
                          onChange={(e) => handleToggleChange('face', 'cctvEnabled', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">แจ้งเตือนเมื่อตรวจพบใบหน้า</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          รับการแจ้งเตือนเมื่อมีการตรวจพบใบหน้าของคุณในระบบ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={faceSettings.notifyOnDetection} 
                          onChange={(e) => handleToggleChange('face', 'notifyOnDetection', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">แชร์ข้อมูลกับทีม</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          อนุญาตให้แชร์ข้อมูลใบหน้าของคุณกับทีมงานในองค์กร
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={faceSettings.shareTeamData} 
                          onChange={(e) => handleToggleChange('face', 'shareTeamData', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Save button */}
                  <div className="mt-8">
                    <Button
                      type="button"
                      onClick={saveFaceSettings}
                      isLoading={isSaving}
                    >
                      บันทึกการตั้งค่า
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Notifications tab */}
            {activeTab === 'notifications' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">ตั้งค่าการแจ้งเตือน</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    ปรับแต่งการแจ้งเตือนและรายงานเกี่ยวกับการใช้งานระบบ
                  </p>
                  
                  {errors.notifications && (
                    <div className="mb-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md">
                      <p>{errors.notifications}</p>
                    </div>
                  )}
                  
                  {/* Toggle switches for notification settings */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">การแจ้งเตือนทางอีเมล</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          รับการแจ้งเตือนและรายงานทางอีเมล
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.emailNotifications} 
                          onChange={(e) => handleToggleChange('notification', 'emailNotifications', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">การแจ้งเตือนบนเว็บไซต์</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          รับการแจ้งเตือนเมื่อมีการใช้งานบนเว็บไซต์
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.pushNotifications} 
                          onChange={(e) => handleToggleChange('notification', 'pushNotifications', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">แจ้งเตือนการเข้าสู่ระบบ</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          รับการแจ้งเตือนเมื่อมีการเข้าสู่ระบบในบัญชีของคุณ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.loginAlerts} 
                          onChange={(e) => handleToggleChange('notification', 'loginAlerts', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">รายงานกิจกรรม</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          รับรายงานสรุปกิจกรรมการใช้งานของคุณ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.activityReports} 
                          onChange={(e) => handleToggleChange('notification', 'activityReports', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">รายงานสัปดาห์</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          รับรายงานสรุปประจำสัปดาห์เกี่ยวกับการใช้งานระบบ
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.weeklyReports} 
                          onChange={(e) => handleToggleChange('notification', 'weeklyReports', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Save button */}
                  <div className="mt-8">
                    <Button
                      type="button"
                      onClick={saveNotificationSettings}
                      isLoading={isSaving}
                    >
                      บันทึกการตั้งค่า
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
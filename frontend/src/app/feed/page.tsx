'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '../components/ui/button';
import ThemeToggle from '../components/theme/ThemeToggle';
import apiService from '../services/api.service';
import faceNetService from '../services/facenet.service';
import * as blazeface from '@tensorflow-models/blazeface';

export default function FeedPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [activeTab, setActiveTab] = useState('for-you');
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  
  // ตัวแปรเพิ่มเติมสำหรับฟีเจอร์การแท็กใบหน้า
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingFaces, setIsProcessingFaces] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isAutoTagEnabled, setIsAutoTagEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ข้อมูลจำลองสำหรับคนที่แนะนำให้ติดตาม (เน้นที่ผู้ใช้ในระบบจริง)
  const suggestedUsers = [
    { id: 1, name: 'สมชาย ใจดี', username: 'somchai', avatar: 'https://ui-avatars.com/api/?name=สมชาย&background=random' },
    { id: 2, name: 'สมศรี มีทรัพย์', username: 'somsri', avatar: 'https://ui-avatars.com/api/?name=สมศรี&background=random' },
    { id: 3, name: 'วีระ เจริญพร', username: 'weera', avatar: 'https://ui-avatars.com/api/?name=วีระ&background=random' },
  ];

  // ข้อมูลจำลองสำหรับโพสต์ (ปรับให้มีการแท็กใบหน้า)
  const posts = [
    {
      id: 1,
      user: {
        name: 'สมชาย ใจดี',
        username: 'somchai',
        avatar: 'https://ui-avatars.com/api/?name=สมชาย&background=random',
        verified: true
      },
      content: 'วันนี้ได้ทดลองใช้ระบบจดจำใบหน้าใหม่ของ FaceSocial ต้องบอกว่าความแม่นยำสูงมาก แนะนำให้ลองใช้ดู #FaceRecognition #AITechnology',
      images: ['https://source.unsplash.com/random/800x600/?technology'],
      faceTags: [
        { id: 2, name: 'สมศรี มีทรัพย์', position: { x: 150, y: 120, width: 50, height: 50 } }
      ],
      createdAt: '2 ชั่วโมงที่แล้ว',
      likes: 24,
      comments: 3,
      shares: 1
    },
    {
      id: 2,
      user: {
        name: 'สมศรี มีทรัพย์',
        username: 'somsri',
        avatar: 'https://ui-avatars.com/api/?name=สมศรี&background=random',
        verified: false
      },
      content: 'ทำงานกับทีมวันนี้ ระบบเช็คชื่อด้วยใบหน้าทำงานได้ดีมาก ไม่ต้องเสียเวลากดบัตรแล้ว 👍 #FaceSocial #TimeAttendance',
      images: ['https://source.unsplash.com/random/800x600/?office'],
      faceTags: [
        { id: 1, name: 'สมชาย ใจดี', position: { x: 200, y: 150, width: 60, height: 60 } },
        { id: 3, name: 'วีระ เจริญพร', position: { x: 350, y: 170, width: 55, height: 55 } }
      ],
      createdAt: '4 ชั่วโมงที่แล้ว',
      likes: 42,
      comments: 7,
      shares: 3
    },
    {
      id: 3,
      user: {
        name: 'วีระ เจริญพร',
        username: 'weera',
        avatar: 'https://ui-avatars.com/api/?name=วีระ&background=random',
        verified: true
      },
      content: 'กำลังพัฒนาระบบเข้าสู่ระบบด้วยใบหน้า ใครมีคำแนะนำดีๆ ช่วยแนะนำหน่อยครับ #WebDevelopment #Programming #FaceSocial',
      createdAt: 'เมื่อวาน',
      likes: 15,
      comments: 5,
      shares: 0
    },
    {
      id: 4,
      user: {
        name: 'มานะ ตั้งใจ',
        username: 'mana',
        avatar: 'https://ui-avatars.com/api/?name=มานะ&background=random',
        verified: false
      },
      content: 'ติดตั้งกล้องวงจรปิดอัจฉริยะของ FaceSocial ในอาคารสำนักงานเสร็จแล้ว ความปลอดภัยเพิ่มขึ้นเยอะมาก ระบบตรวจจับใบหน้าทำงานได้เร็วมาก #CCTV #FaceRecognition',
      images: ['https://source.unsplash.com/random/800x600/?security'],
      faceTags: [],
      createdAt: '2 วันที่แล้ว',
      likes: 8,
      comments: 12,
      shares: 2
    }
  ];
  
  // โหลดโมเดล BlazeFace สำหรับตรวจจับใบหน้า
  useEffect(() => {
    async function loadModel() {
      try {
        if (!model) {
          console.log("กำลังโหลดโมเดล BlazeFace...");
          const loadedModel = await blazeface.load();
          console.log("โหลดโมเดล BlazeFace สำเร็จ");
          setModel(loadedModel);
        }
      } catch (error) {
        console.error("ไม่สามารถโหลดโมเดล BlazeFace ได้:", error);
      }
    }
    
    loadModel();
  }, [model]);

  // ตรวจสอบว่ามี token หรือไม่เมื่อโหลดหน้า
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!apiService.hasAuthToken()) {
          router.push('/login');
          return;
        }
        
        // ดึงข้อมูลจาก localStorage
        const storedUserData = localStorage.getItem('userData');
        let userData = storedUserData ? JSON.parse(storedUserData) : null;
        
        if (!userData || !userData.firstName || !userData.lastName) {
          userData = {
            id: 'current-user',
            username: 'current_user',
            firstName: '',
            lastName: '', 
            email: 'user@example.com',
            bio: '',
            profileImage: null
          };
          
          const isProfileCompleted = userData.firstName && userData.lastName;
          if (!isProfileCompleted) {
            router.push('/profile/settings?first_time=true');
            return;
          }
        }
        
        setUserData(userData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        apiService.clearAuthToken();
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);
  
  // ออกจากระบบ
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      try {
        await apiService.logout();
      } catch (error) {
        console.info('Logout API ยังไม่พร้อมใช้งาน ล้าง token แทน');
        apiService.clearAuthToken();
      }
      
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      apiService.clearAuthToken();
      router.push('/login');
    }
  };

  // เปิดหน้าต่างเลือกไฟล์รูปภาพ
  const handleOpenFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // จัดการการเลือกไฟล์รูปภาพ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedImage(file);
    
    // สร้าง URL สำหรับแสดงตัวอย่างรูปภาพ
    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);
    
    // ล้างข้อมูลใบหน้าที่ตรวจพบก่อนหน้านี้
    setDetectedFaces([]);
    
    // ถ้าเปิดใช้การแท็กอัตโนมัติ ให้ตรวจจับใบหน้าเมื่อภาพพร้อม
    if (isAutoTagEnabled) {
      // รอให้ภาพโหลดเสร็จก่อนตรวจจับใบหน้า
      const img = new Image();
      img.onload = () => {
        detectFaces(img);
      };
      img.src = imageUrl;
    }
  };

  // ตรวจจับใบหน้าในรูปภาพ
  const detectFaces = async (imgElement: HTMLImageElement) => {
    if (!model) {
      console.error("โมเดล BlazeFace ยังไม่พร้อมใช้งาน");
      return;
    }
    
    try {
      setIsProcessingFaces(true);
      
      // ตรวจจับใบหน้าด้วย BlazeFace
      const predictions = await model.estimateFaces(imgElement, false);
      console.log("ตรวจพบใบหน้า:", predictions.length, "ใบหน้า");
      
      // แปลงผลลัพธ์ให้อยู่ในรูปแบบที่ใช้งานง่าย
      const faces = predictions.map((prediction, index) => {
        const start = prediction.topLeft as [number, number];
        const end = prediction.bottomRight as [number, number];
        const width = end[0] - start[0];
        const height = end[1] - start[1];
        
        // สร้าง dummy user ในกรณีที่ยังไม่ได้แท็ก
        return {
          id: index,
          position: {
            x: start[0],
            y: start[1],
            width: width,
            height: height
          },
          user: null, // จะถูกระบุตัวตนภายหลัง
          confidence: prediction.probability[0]
        };
      });
      
      setDetectedFaces(faces);
      setIsProcessingFaces(false);
      
      // ทดลองระบุตัวตนอัตโนมัติ (ในสภาพแวดล้อมจริงจะใช้ API)
      if (faces.length > 0) {
        tryIdentifyFaces(faces, imgElement);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการตรวจจับใบหน้า:", error);
      setIsProcessingFaces(false);
    }
  };
  
  // ทดลองระบุตัวตนของใบหน้าที่ตรวจพบ (ในสภาพแวดล้อมจริงจะใช้ API)
  const tryIdentifyFaces = async (faces: any[], imgElement: HTMLImageElement) => {
    // จำลองการดึงข้อมูลผู้ใช้จากทั้งหมด
    const mockUsers = [
      { id: 1, name: 'สมชาย ใจดี', username: 'somchai' },
      { id: 2, name: 'สมศรี มีทรัพย์', username: 'somsri' },
      { id: 3, name: 'วีระ เจริญพร', username: 'weera' }
    ];
    
    // สุ่มแท็กผู้ใช้ (ในระบบจริงจะใช้ face embeddings เปรียบเทียบ)
    const identifiedFaces = faces.map(face => {
      // สุ่มผู้ใช้หรือปล่อยว่างไว้
      const randomUser = Math.random() > 0.3 
        ? mockUsers[Math.floor(Math.random() * mockUsers.length)]
        : null;
        
      return {
        ...face,
        user: randomUser
      };
    });
    
    setDetectedFaces(identifiedFaces);
  };
  
  // ระบุตัวตนให้กับใบหน้าที่ตรวจพบ
  const handleTagUser = (faceIndex: number, user: any) => {
    const updatedFaces = [...detectedFaces];
    updatedFaces[faceIndex].user = user;
    setDetectedFaces(updatedFaces);
  };
  
  // ลบการแท็กใบหน้า
  const handleRemoveTag = (faceIndex: number) => {
    const updatedFaces = [...detectedFaces];
    updatedFaces[faceIndex].user = null;
    setDetectedFaces(updatedFaces);
  };

  // สร้างโพสต์ใหม่
  const handleCreatePost = () => {
    if (!newPostContent.trim() && !imagePreview) return;
    
    // จำลองการสร้างโพสต์ (ในอนาคตจะใช้ API จริง)
    console.log('สร้างโพสต์ใหม่:', {
      content: newPostContent,
      image: selectedImage ? selectedImage.name : null,
      faceTags: detectedFaces.filter(face => face.user)
    });
    
    // รีเซ็ตข้อมูล
    setShowNewPostModal(false);
    setNewPostContent('');
    setSelectedImage(null);
    setImagePreview(null);
    setDetectedFaces([]);
    
    // แสดงการแจ้งเตือนความสำเร็จ
    alert('สร้างโพสต์สำเร็จ');
  };
  
  const handleExpandImage = (imageUrl: string) => {
    setExpandedImageUrl(imageUrl);
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
      {/* Header - Mobile only */}
      <header className="md:hidden bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <div className="px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img 
              src={userData?.profileImage || `https://ui-avatars.com/api/?name=${userData?.firstName || 'User'}&background=random`} 
              alt="Profile" 
              className="w-8 h-8 rounded-full"
            />
          </div>
          <h1 className="text-xl font-bold text-center flex-1 text-gray-900 dark:text-white">FaceSocial</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Left sidebar - Desktop */}
        <aside className="hidden md:block w-64 sticky top-0 h-screen pt-6 pr-6 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-4 mb-6">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">FaceSocial</h1>
            </div>
            
            {/* Main navigation */}
            <nav className="mb-6 space-y-1">
              <Link href="/feed" className="flex items-center space-x-3 px-4 py-3 text-gray-900 dark:text-white font-medium bg-gray-100 dark:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>หน้าแรก</span>
              </Link>
              
              <Link href="/profile" className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>โปรไฟล์</span>
              </Link>
              
              <Link href="/notifications" className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>การแจ้งเตือน</span>
              </Link>
              
              <Link href="/messages" className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>ข้อความ</span>
              </Link>
              
              {/* เพิ่มเมนูสำหรับระบบกล้องวงจรปิด */}
              <Link href="/cctv" className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>กล้องวงจรปิด</span>
              </Link>
              
              {/* เพิ่มเมนูสำหรับระบบบันทึกเวลาทำงาน */}
              <Link href="/attendance" className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>บันทึกเวลาทำงาน</span>
              </Link>
              
              {/* เพิ่มเมนูสำหรับแดชบอร์ด */}
              <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>แดชบอร์ด</span>
              </Link>
            </nav>
            
            {/* Post button */}
            <button 
              onClick={() => setShowNewPostModal(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full py-3 transition duration-200"
            >
              โพสต์
            </button>
            
            {/* User profile - bottom */}
            <div className="mt-auto mb-6">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <img 
                  src={userData?.profileImage || `https://ui-avatars.com/api/?name=${userData?.firstName || 'User'}&background=random`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {userData?.firstName} {userData?.lastName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{userData?.username || 'user'}
                  </p>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  title="ออกจากระบบ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Header - Desktop */}
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
            <div className="px-4 py-3 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">หน้าแรก</h2>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button 
                className={`flex-1 text-center py-4 font-medium relative ${activeTab === 'for-you' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('for-you')}
              >
                สำหรับคุณ
                {activeTab === 'for-you' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></span>
                )}
              </button>
              <button 
                className={`flex-1 text-center py-4 font-medium relative ${activeTab === 'following' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('following')}
              >
                กำลังติดตาม
                {activeTab === 'following' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></span>
                )}
              </button>
            </div>
          </header>
          
          {/* Create post box - only visible on larger screens */}
          <div className="hidden md:block px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex space-x-4">
              <img 
                src={userData?.profileImage || `https://ui-avatars.com/api/?name=${userData?.firstName || 'User'}&background=random`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <textarea
                  placeholder={`คุณกำลังคิดอะไรอยู่ ${userData?.firstName}?`}
                  className="w-full bg-transparent border-0 focus:ring-0 text-gray-700 dark:text-gray-200 resize-none"
                  rows={2}
                  onClick={() => setShowNewPostModal(true)}
                ></textarea>
                <div className="flex mt-2 justify-between">
                  <div className="flex space-x-1">
                    <button 
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" 
                      title="เพิ่มรูปภาพ"
                      onClick={() => setShowNewPostModal(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" 
                      title="แท็กใบหน้าอัตโนมัติ"
                      onClick={() => setShowNewPostModal(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <button 
                    className="px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition duration-200"
                    onClick={() => setShowNewPostModal(true)}
                  >
                    โพสต์
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Posts */}
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {posts.map(post => (
              <article key={post.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                <div className="flex space-x-3">
                  <img src={post.user.avatar} alt={post.user.name} className="w-12 h-12 rounded-full" />
                  <div className="flex-1 min-w-0">
                    {/* User info */}
                    <div className="flex items-center space-x-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">{post.user.name}</h4>
                      {post.user.verified && (
                        <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-5 h-5 text-blue-500 fill-current">
                          <g>
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path>
                          </g>
                        </svg>
                      )}
                      <span className="text-gray-500 dark:text-gray-400">@{post.user.username}</span>
                      <span className="text-gray-500 dark:text-gray-400">·</span>
                      <span className="text-gray-500 dark:text-gray-400">{post.createdAt}</span>
                    </div>
                    
                    {/* Post content */}
                    <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
                    
                    {/* Post images with face tags */}
                    {post.images && post.images.length > 0 && (
                      <div className="mt-3">
                        {post.images.map((image, imageIndex) => (
                          <div 
                            key={imageIndex} 
                            className="relative rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => handleExpandImage(image)}
                          >
                            <img 
                              src={image} 
                              alt={`Post ${imageIndex}`} 
                              className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300" 
                            />
                            
                            {/* Face tags */}
                            {post.faceTags && post.faceTags.map((tag, tagIndex) => (
                              <div
                                key={tagIndex}
                                className="absolute border-2 border-blue-500 bg-blue-500/10"
                                style={{
                                  left: `${(tag.position.x / 800) * 100}%`,
                                  top: `${(tag.position.y / 600) * 100}%`,
                                  width: `${(tag.position.width / 800) * 100}%`,
                                  height: `${(tag.position.height / 600) * 100}%`
                                }}
                              >
                                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 truncate">
                                  {tag.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="mt-3 flex justify-between max-w-md">
                      <button className="group flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                        <span className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </span>
                        <span className="ml-1 text-sm">{post.comments}</span>
                      </button>
                      
                      <button className="group flex items-center text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400">
                        <span className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </span>
                        <span className="ml-1 text-sm">{post.shares}</span>
                      </button>
                      
                      <button className="group flex items-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                        <span className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </span>
                        <span className="ml-1 text-sm">{post.likes}</span>
                      </button>
                      
                      {/* ปุ่มแท็กใบหน้า */}
                      <button className="group flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                        <span className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>

        {/* Right sidebar - Desktop only */}
        <aside className="hidden lg:block w-80 sticky top-0 h-screen pl-6 pt-6 overflow-y-auto">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาใน FaceSocial"
                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* ข้อมูลระบบจดจำใบหน้า */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
            <h3 className="font-bold text-xl p-4 text-gray-900 dark:text-white">ระบบจดจำใบหน้า</h3>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ความแม่นยำการจดจำ</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">98.7%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.7%' }}></div>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ใบหน้าที่บันทึกไว้</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">1,205 ใบหน้า</span>
                </div>
              </div>
              <Link href="/face-settings" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
                จัดการการตั้งค่าใบหน้า
              </Link>
            </div>
          </div>
          
          {/* Who to follow */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
            <h3 className="font-bold text-xl p-4 text-gray-900 dark:text-white">แนะนำให้ติดตาม</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {suggestedUsers.map(user => (
                <div key={user.id} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{user.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                      </div>
                    </div>
                    <button className="px-4 py-1 bg-black dark:bg-white text-white dark:text-black font-medium text-sm rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                      ติดตาม
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* ลิงค์ด่วนไปยังระบบอื่น */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
            <h3 className="font-bold text-xl p-4 text-gray-900 dark:text-white">ลิงค์ด่วน</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Link href="/attendance" className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>บันทึกเวลาทำงาน</span>
                </Link>
              </div>
              <div className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Link href="/cctv" className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>ระบบกล้องวงจรปิด</span>
                </Link>
              </div>
              <div className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Link href="/dashboard" className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>แดชบอร์ด</span>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Footer links */}
          <div className="px-4 mb-6">
            <div className="flex flex-wrap text-xs text-gray-500 dark:text-gray-400">
              <a href="#" className="mr-2 mb-2 hover:underline">เงื่อนไขการให้บริการ</a>
              <a href="#" className="mr-2 mb-2 hover:underline">นโยบายความเป็นส่วนตัว</a>
              <a href="#" className="mr-2 mb-2 hover:underline">ข้อมูลโฆษณา</a>
              <a href="#" className="mr-2 mb-2 hover:underline">เพิ่มเติม</a>
              <span>© 2025 FaceSocial</span>
            </div>
          </div>
        </aside>
      </div>
      
      {/* Floating action button - Mobile only */}
      <div className="fixed bottom-24 right-6 md:hidden z-10">
        <button 
          onClick={() => setShowNewPostModal(true)}
          className="w-16 h-16 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
      
      {/* Bottom navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around">
          <Link href="/feed" className="flex flex-col items-center py-3 px-3 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">หน้าหลัก</span>
          </Link>
          
          <Link href="/attendance" className="flex flex-col items-center py-3 px-3 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1">บันทึกเวลา</span>
          </Link>
          
          <Link href="/cctv" className="flex flex-col items-center py-3 px-3 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">กล้อง</span>
          </Link>
          
          <Link href="/profile" className="flex flex-col items-center py-3 px-3 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">โปรไฟล์</span>
          </Link>
        </div>
      </nav>
      
      {/* Modal for creating new post with face tagging */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl transition-colors duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setShowNewPostModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">สร้างโพสต์</h3>
              <div className="w-10"></div>
            </div>
            
            <div className="p-4">
              <div className="flex space-x-3">
                <img 
                  src={userData?.profileImage || `https://ui-avatars.com/api/?name=${userData?.firstName || 'User'}&background=random`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="mb-2">
                    <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium flex items-center space-x-1">
                      <span>สาธารณะ</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    placeholder={`คุณกำลังคิดอะไรอยู่ ${userData?.firstName}?`}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full border-0 focus:ring-0 text-gray-700 dark:text-gray-200 bg-transparent resize-none"
                    rows={3}
                  ></textarea>
                  
                  {/* แสดงรูปภาพและใบหน้าที่ตรวจพบ */}
                  {imagePreview && (
                    <div className="my-3">
                      <div className="relative rounded-lg overflow-hidden">
                        <img 
                          ref={imageRef}
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-auto max-h-80 object-contain" 
                        />
                        
                        {/* แสดงกรอบใบหน้าที่ตรวจพบ */}
                        {detectedFaces.map((face, index) => (
                          <div
                            key={index}
                            className={`absolute border-2 ${face.user ? 'border-green-500' : 'border-yellow-500'}`}
                            style={{
                              left: face.position.x,
                              top: face.position.y,
                              width: face.position.width,
                              height: face.position.height
                            }}
                          >
                            {face.user ? (
                              <div className="absolute -bottom-6 left-0 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                                {face.user.name}
                                <button 
                                  className="ml-1 text-white hover:text-red-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTag(index);
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
                        ))}
                        
                        {isProcessingFaces && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* ถ้าตรวจพบใบหน้า */}
                      {detectedFaces.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          พบใบหน้า {detectedFaces.length} ใบหน้า
                          {detectedFaces.some(face => !face.user) && (
                            <span className="ml-1">
                              (คลิกที่กรอบใบหน้าเพื่อแท็ก)
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* สวิตช์เปิด-ปิดการแท็กอัตโนมัติ */}
                      <div className="mt-2 flex items-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAutoTagEnabled}
                            onChange={() => setIsAutoTagEnabled(!isAutoTagEnabled)}
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                            แท็กใบหน้าอัตโนมัติ
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                    <div className="flex space-x-2">
                      {/* ปุ่มเพิ่มรูปภาพ */}
                      <button 
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" 
                        title="เพิ่มรูปภาพ"
                        onClick={handleOpenFileSelector}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      
                      {/* ปุ่มเพิ่มการแท็กใบหน้า (สำหรับตรวจจับใบหน้าในรูปที่มีอยู่แล้ว) */}
                      {imagePreview && (
                        <button 
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" 
                          title="ตรวจจับใบหน้า"
                          onClick={() => imageRef.current && detectFaces(imageRef.current)}
                          disabled={isProcessingFaces}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      
                      <button className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" title="เพิ่มอิโมจิ">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() && !imagePreview}
                      className={`px-4 py-1 rounded-full ${
                        newPostContent.trim() || imagePreview
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-blue-300 text-white cursor-not-allowed'
                      } font-medium transition-colors`}
                    >
                      โพสต์
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Image viewer modal */}
      {expandedImageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImageUrl(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setExpandedImageUrl(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={expandedImageUrl} 
            alt="Expanded" 
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
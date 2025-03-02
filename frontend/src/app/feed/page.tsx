'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Button from '../components/ui/button';
import ThemeToggle from '../components/theme/ThemeToggle';
import apiService from '../services/api.service';
import postService from '../services/post.service';
import ApiConnectionTester from '../components/ApiConnectionTester';
import PostList from '../components/post/PostList';
import CreatePostForm from '../components/post/CreatePostForm';

export default function FeedPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [activeTab, setActiveTab] = useState('for-you');
  const [isTestMode, setIsTestMode] = useState(false);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  // ข้อมูลจำลองสำหรับคนที่แนะนำให้ติดตาม (ในอนาคตจะเปลี่ยนเป็นข้อมูลจริงจาก API)
  const suggestedUsers = [
    { id: 1, name: 'สมชาย ใจดี', username: 'somchai', avatar: 'https://ui-avatars.com/api/?name=สมชาย&background=random' },
    { id: 2, name: 'สมศรี มีทรัพย์', username: 'somsri', avatar: 'https://ui-avatars.com/api/?name=สมศรี&background=random' },
    { id: 3, name: 'วีระ เจริญพร', username: 'weera', avatar: 'https://ui-avatars.com/api/?name=วีระ&background=random' },
  ];

  // ตรวจสอบว่ามี token หรือไม่เมื่อโหลดหน้า
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!apiService.hasAuthToken()) {
          router.push('/login');
          return;
        }
        
        // ดึงข้อมูลผู้ใช้ปัจจุบันจาก API
        try {
          const currentUser = await apiService.getCurrentUser();
          setUserData(currentUser);
          console.log("โหลดข้อมูลผู้ใช้สำเร็จ:", currentUser);
        } catch (error) {
          console.warn("ไม่สามารถโหลดข้อมูลผู้ใช้จาก API ได้:", error);
          
          // ถ้าไม่สามารถดึงข้อมูลผู้ใช้จาก API ได้ ให้ใช้ข้อมูลจาก localStorage แทน
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
        }
        
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

  // จัดการเมื่อสร้างโพสต์ใหม่
  const handlePostCreated = () => {
    setShowNewPostModal(false);
    // รีเฟรช PostList component เพื่อโหลดโพสต์ใหม่
    setPostsRefreshKey(prev => prev + 1);
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
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {userData?.profileImage ? (
                <Image 
                  src={userData.profileImage.startsWith('http') ? userData.profileImage : `/api${userData.profileImage}`}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-bold">
                  {userData?.firstName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
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
            
            {/* Test Mode Toggle */}
            <div className="mt-4 px-4">
              <button
                onClick={() => setIsTestMode(!isTestMode)}
                className={`text-sm px-3 py-1 rounded-full ${isTestMode ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
              >
                {isTestMode ? 'ปิดโหมดทดสอบ' : 'เปิดโหมดทดสอบ'}
              </button>
            </div>
            
            {/* User profile - bottom */}
            <div className="mt-auto mb-6">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  {userData?.profileImage ? (
                    <Image 
                      src={userData.profileImage.startsWith('http') ? userData.profileImage : `/api${userData.profileImage}`}
                      alt={`${userData.firstName} ${userData.lastName}`}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-lg font-bold">
                      {userData?.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
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
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {userData?.profileImage ? (
                  <Image 
                    src={userData.profileImage.startsWith('http') ? userData.profileImage : `/api${userData.profileImage}`}
                    alt={`${userData.firstName} ${userData.lastName}`}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-lg font-bold">
                    {userData?.firstName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
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
          
          {/* Test Mode UI */}
          {isTestMode && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-900">
              <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                โหมดทดสอบการเชื่อมต่อ API
              </div>
              <ApiConnectionTester />
            </div>
          )}
          
          {/* Posts - เปลี่ยนจากการวนลูปข้อมูลจำลองเป็นใช้ PostList component */}
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <PostList 
              key={postsRefreshKey}
              initialPosts={[]} 
            />
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
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {userData?._count?.faceData || 0} ใบหน้า
                  </span>
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
              {userData && (
                <CreatePostForm
                  user={userData}
                  onPostCreated={handlePostCreated}
                  onCancel={() => setShowNewPostModal(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
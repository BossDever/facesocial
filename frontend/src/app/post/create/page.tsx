'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiService from '@/app/services/api.service';
import postService from '@/app/services/post.service';
import CreatePostForm from '@/app/components/post/CreatePostForm';
import Button from '@/app/components/ui/button';

export default function CreatePostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!apiService.hasAuthToken()) {
          router.push('/login?redirect=/post/create');
          return;
        }
        
        // ดึงข้อมูลผู้ใช้ปัจจุบัน
        try {
          const userData = await apiService.getCurrentUser();
          setUserData(userData);
        } catch (error) {
          // ถ้าไม่สามารถดึงข้อมูลผู้ใช้ได้ ให้ใช้ข้อมูลจาก localStorage แทน
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            setUserData(JSON.parse(storedUserData));
          } else {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาเข้าสู่ระบบอีกครั้ง');
        apiService.clearAuthToken();
        router.push('/login?redirect=/post/create');
      }
    };
    
    checkAuth();
  }, [router]);

  const handlePostCreated = () => {
    router.push('/feed');
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Link href="/login" className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              เข้าสู่ระบบอีกครั้ง
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">สร้างโพสต์ใหม่</h1>
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              ยกเลิก
            </Button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">แบ่งปันความคิด รูปภาพ หรือวิดีโอกับเพื่อนๆ ของคุณ</p>
        </div>
        
        <CreatePostForm
          user={userData}
          onPostCreated={handlePostCreated}
          onCancel={handleCancel}
          className="mb-6"
        />
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">คำแนะนำในการสร้างโพสต์</h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc pl-5">
            <li>เนื้อหาของคุณควรเป็นไปตามข้อกำหนดการใช้งาน</li>
            <li>รูปภาพที่อัปโหลดควรมีขนาดไม่เกิน 10 MB ต่อไฟล์</li>
            <li>รองรับไฟล์รูปภาพ (JPG, PNG, GIF) และวิดีโอ (MP4, WebM)</li>
            <li>การแท็กใบหน้าอัตโนมัติจะช่วยให้ระบบระบุตัวบุคคลในรูปภาพได้</li>
            <li>คุณสามารถอัปโหลดได้สูงสุด 10 ไฟล์ต่อโพสต์</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
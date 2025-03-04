'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import ThemeToggle from '../components/theme/ThemeToggle';
import apiService from '../services/api.service';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session_expired') === 'true';
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // ตรวจสอบการล็อกอินเมื่อโหลดหน้า
  useEffect(() => {
    // ถ้ามีข้อความ session_expired ให้แสดงข้อความ
    if (sessionExpired) {
      setMessage('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    }
    
    // ตรวจสอบว่ามี token อยู่แล้วหรือไม่
    if (apiService.hasAuthToken()) {
      // ถ้ามี token อยู่แล้ว ให้นำไปยังหน้า feed
      router.push('/feed');
    }
    
    // ตรวจสอบว่ามีพารามิเตอร์ error หรือไม่
    const errorMessage = searchParams.get('error');
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
    }
    
    // ตรวจสอบว่ามีพารามิเตอร์ success หรือไม่
    const successMessage = searchParams.get('success');
    if (successMessage) {
      setMessage(decodeURIComponent(successMessage));
    }
  }, [sessionExpired, router, searchParams]);
  
  // จัดการการเปลี่ยนแปลงใน input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    
    // ลบข้อผิดพลาดเมื่อผู้ใช้แก้ไข
    if (error) setError(null);
  };
  
  // ตรวจสอบข้อมูลก่อนเข้าสู่ระบบ
  const validateForm = () => {
    if (!loginData.username.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้หรืออีเมล');
      return false;
    }
    
    if (!loginData.password) {
      setError('กรุณากรอกรหัสผ่าน');
      return false;
    }
    
    return true;
  };
  
  // จัดการการกด Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };
  
  // จัดการการเข้าสู่ระบบ
  const handleLogin = async () => {
    // ตรวจสอบข้อมูล
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // เรียกใช้ API เข้าสู่ระบบ
      const response = await apiService.login(loginData);
      
      // ตรวจสอบผลลัพธ์
      if (response && response.token) {
        // เข้าสู่ระบบสำเร็จ นำไปยังหน้า feed
        router.push('/feed');
      } else {
        // เข้าสู่ระบบไม่สำเร็จ
        setError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง');
      }
    } catch (err: any) {
      // จัดการข้อผิดพลาด
      console.error('Login error:', err);
      
      // ตรวจสอบประเภทข้อผิดพลาด
      if (err.response && err.response.status === 401) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองอีกครั้งในภายหลัง');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // ไปยังหน้าเข้าสู่ระบบด้วยใบหน้า
  const goToFaceLogin = () => {
    router.push('/login/face');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            FaceSocial
          </h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            เข้าสู่ระบบ
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            หรือ{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              สมัครสมาชิกใหม่
            </Link>
          </p>
        </div>
        
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg transition-colors duration-200">
            {message && (
              <div className="mb-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{message}</span>
              </div>
            )}
            
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <div className="space-y-6">
              <Input
                label="ชื่อผู้ใช้หรืออีเมล"
                name="username"
                type="text"
                value={loginData.username}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              
              <Input
                label="รหัสผ่าน"
                name="password"
                type="password"
                value={loginData.password}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                showPasswordToggle={true}
              />
              
              <div>
                <Button
                  type="button"
                  onClick={handleLogin}
                  className="w-full"
                  isLoading={isLoading}
                >
                  เข้าสู่ระบบ
                </Button>
              </div>
              
              <div className="relative flex items-center justify-center">
                <div className="absolute h-px w-full bg-gray-300 dark:bg-gray-600"></div>
                <span className="relative bg-white dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400">
                  หรือ
                </span>
              </div>
              
              <div>
                <Button
                  type="button"
                  onClick={goToFaceLogin}
                  variant="secondary"
                  className="w-full"
                >
                  เข้าสู่ระบบด้วยใบหน้า
                </Button>
              </div>
              
              <div className="text-center">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
            </div>
            
            <div className="mt-6">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                <Link href="/" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  กลับไปยังหน้าหลัก
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
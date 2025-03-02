'use client';

import React from 'react';
import Link from 'next/link';
import Button from '../../components/ui/button';
import ThemeToggle from '../../components/theme/ThemeToggle';

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            FaceSocial
          </h1>
          <div className="mt-4 p-4 rounded-full bg-green-100 dark:bg-green-800 inline-flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            ลงทะเบียนสำเร็จ!
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            ขอบคุณที่สมัครใช้งาน FaceSocial<br />
            คุณสามารถเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สร้างไว้<br />
            หรือใช้การสแกนใบหน้าในการเข้าสู่ระบบ
          </p>
        </div>
        
        <div className="mt-6">
          <Link href="/login">
            <Button className="w-full" variant="primary">
              เข้าสู่ระบบ
            </Button>
          </Link>
          
          <Link href="/" className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
            กลับไปยังหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
'use client';

import Link from 'next/link';
import ThemeToggle from './components/theme/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">FaceSocial</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          แพลตฟอร์มโซเชียลมีเดียที่ผสานเทคโนโลยีจดจำใบหน้า
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/register"
            className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            สมัครสมาชิก
          </Link>
          <Link
            href="/dashboard"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
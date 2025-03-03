'use client';

import React from 'react';
import ApiConnectionTester from '../components/ApiConnectionTester';
import Link from 'next/link';
import ThemeToggle from '../components/theme/ThemeToggle';

export default function ApiTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Connection Tester</h1>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              กลับไปหน้า Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">วิธีใช้งาน</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            หน้านี้ใช้สำหรับทดสอบการเชื่อมต่อระหว่าง Frontend และ Backend API เพื่อตรวจสอบว่าระบบพร้อมใช้งานหรือไม่
          </p>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">ขั้นตอนการทดสอบ</h3>
            <ol className="list-decimal pl-5 space-y-2 text-gray-600 dark:text-gray-300">
              <li>คลิกที่ปุ่ม "ทดสอบการเชื่อมต่อทั่วไป" เพื่อทดสอบ API ที่ไม่ต้องใช้การยืนยันตัวตน</li>
              <li>หากมีการเข้าสู่ระบบแล้ว สามารถคลิกที่ปุ่ม "ทดสอบ API ที่ต้องยืนยันตัวตน" เพื่อทดสอบ API ที่ต้องใช้การยืนยันตัวตน</li>
              <li>ผลลัพธ์จะแสดงสถานะการเชื่อมต่อของแต่ละ API พร้อมรายละเอียด</li>
            </ol>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">การแก้ไขปัญหา</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
              <li>หากพบว่า API ใดไม่พร้อมใช้งาน ตรวจสอบว่า Backend API ทำงานอยู่หรือไม่</li>
              <li>ตรวจสอบว่า URL ของ API ถูกต้องหรือไม่ (ใน <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">.env.local</code>)</li>
              <li>ตรวจสอบว่ามีการเชื่อมต่ออินเทอร์เน็ตหรือไม่</li>
              <li>หากยังมีปัญหา ลองตรวจสอบ Console ใน Developer Tools เพื่อดูข้อผิดพลาดที่เกิดขึ้น</li>
            </ul>
          </div>
        </div>
        
        <ApiConnectionTester />
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">การตั้งค่า API URL</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            การเชื่อมต่อ API ใช้ URL ตามการตั้งค่าในไฟล์ <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">.env.local</code> หรือใช้ค่าเริ่มต้น
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    API
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ตัวแปรสภาพแวดล้อม
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ค่าเริ่มต้น
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    Backend API
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">NEXT_PUBLIC_API_URL</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">http://localhost:5000/api</code>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    FaceNet API
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">NEXT_PUBLIC_FACENET_API_URL</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">http://localhost:8000</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">ตัวอย่างไฟล์ .env.local</h3>
            <div className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                <code>
{`# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# FaceNet API URL
NEXT_PUBLIC_FACENET_API_URL=http://localhost:8000`}
                </code>
              </pre>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">การเริ่มต้นใช้งาน Backend API</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              เริ่มต้นใช้งาน Backend API โดยดำเนินการดังนี้
            </p>
            <div className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                <code>
{`# สร้างไฟล์ .env จาก .env.example
cp backend/.env.example backend/.env

# ติดตั้ง dependencies
cd backend
npm install

# สร้าง Prisma client
npm run prisma:generate

# สร้างฐานข้อมูล (ต้องมี Docker และ Docker Compose ติดตั้งไว้)
cd ../docker
docker-compose up -d

# กลับไปที่ backend และสร้างตารางในฐานข้อมูล
cd ../backend
npm run prisma:migrate

# เริ่มต้น backend server แบบ development
npm run dev

# เปิดเบราว์เซอร์ไปที่ http://localhost:5000/api/health เพื่อตรวจสอบว่า API ทำงานหรือไม่`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// แก้ไขไฟล์ frontend\src\app\dashboard\page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '../components/dashboard/StatCard';
import StatusCard from '../components/dashboard/StatusCard';
import GpuStatusCard from '../components/dashboard/GpuStatusCard';
import ThemeToggle from '../components/theme/ThemeToggle';
import apiService from '../services/api.service';
import { useTensorflowStatus } from '../hooks/useTensorflowStatus';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    users: { total: 0, change: 0 },
    posts: { total: 0, change: 0 },
    faces: { total: 0, change: 0 },
    activeUsers: { total: 0, change: 0 }
  });
  
  const [apiStatus, setApiStatus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // สถานะ TensorFlow
  const { backendName, isAvailable } = useTensorflowStatus();
  
  const [modelStatus, setModelStatus] = useState([
    { 
      name: 'FaceNet 20180402-114759', 
      status: 'active', 
      details: 'ความแม่นยำ: 98.5%', 
      lastChecked: '10 นาทีที่แล้ว' 
    },
    { 
      name: 'FaceNet 20180408-102900', 
      status: 'active', 
      details: 'ความแม่นยำ: 99.1%', 
      lastChecked: '10 นาทีที่แล้ว' 
    },
  ]);
  
  const [featureStatus, setFeatureStatus] = useState([
    { name: 'ระบบสมัครสมาชิก', status: 'in_progress', progress: 40 },
    { name: 'การเข้าสู่ระบบด้วยใบหน้า', status: 'planned', progress: 0 },
    { name: 'การโพสต์และแชร์', status: 'planned', progress: 0 },
    { name: 'ระบบแท็กใบหน้าอัตโนมัติ', status: 'planned', progress: 0 },
    { name: 'ระบบกล้องวงจรปิด', status: 'planned', progress: 0 },
  ]);
  
  // ดึงข้อมูล API Status จาก backend
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      // แสดงว่ากำลังโหลดข้อมูล
      setIsLoading(true);
      setError(null);
      
      // ตรวจสอบการเชื่อมต่อ API
      try {
        await apiService.checkHealth();
      } catch (healthErr) {
        console.error('Health check failed:', healthErr);
        setError('ไม่สามารถเชื่อมต่อกับ API ได้ กรุณาตรวจสอบว่า Backend API กำลังทำงานอยู่');
        setIsLoading(false);
        return;
      }
      
      // ดึงข้อมูล API Status
      try {
        const apiStatusData = await apiService.getApiStatus();
        setApiStatus(apiStatusData);
      } catch (statusErr) {
        console.error('Failed to fetch API status:', statusErr);
        // ใช้ข้อมูลตัวอย่างถ้าดึงไม่ได้
        setApiStatus([
          { name: 'Authentication API', status: 'active', lastChecked: '2 นาทีที่แล้ว' },
          { name: 'User API', status: 'active', lastChecked: '5 นาทีที่แล้ว' },
          { name: 'Post API', status: 'degraded', details: 'การตอบสนองช้ากว่าปกติ', lastChecked: '3 นาทีที่แล้ว' },
          { name: 'Face Recognition API', status: 'active', lastChecked: '1 นาทีที่แล้ว' },
        ]);
      }
      
      // อัปเดตข้อมูลสถิติ (ข้อมูลตัวอย่าง เพราะยังไม่มี API สำหรับข้อมูลนี้)
      setStats({
        users: { total: 124, change: 15 },
        posts: { total: 347, change: 23 },
        faces: { total: 1205, change: 31 },
        activeUsers: { total: 56, change: -5 }
      });
      
      // อัปเดตสถานะฟีเจอร์ล่าสุด
      setFeatureStatus([
        { name: 'ระบบสมัครสมาชิก', status: 'in_progress', progress: 65 },
        { name: 'การเข้าสู่ระบบด้วยใบหน้า', status: 'in_progress', progress: 30 },
        { name: 'การโพสต์และแชร์', status: 'planned', progress: 0 },
        { name: 'ระบบแท็กใบหน้าอัตโนมัติ', status: 'planned', progress: 0 },
        { name: 'ระบบกล้องวงจรปิด', status: 'planned', progress: 0 },
      ]);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard');
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchDashboardData();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            {isLoading && (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          <div className="flex space-x-4">
            <ThemeToggle />
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">เกิดข้อผิดพลาด: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">ภาพรวมระบบ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="ผู้ใช้งานทั้งหมด" 
              value={stats.users.total} 
              change={stats.users.change}
            />
            <StatCard 
              title="โพสต์ทั้งหมด" 
              value={stats.posts.total} 
              change={stats.posts.change}
            />
            <StatCard 
              title="ใบหน้าที่จดจำได้" 
              value={stats.faces.total} 
              change={stats.faces.change}
            />
            <StatCard 
              title="ผู้ใช้งานที่ออนไลน์" 
              value={stats.activeUsers.total} 
              change={stats.activeUsers.change} 
              changeLabel="จากสัปดาห์ที่แล้ว"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">สถานะ API</h2>
            <div className="space-y-3">
              {apiStatus.length > 0 ? (
                apiStatus.map((api, index) => (
                  <StatusCard 
                    key={index}
                    name={api.name}
                    status={api.status}
                    details={api.details}
                    lastChecked={api.lastChecked}
                  />
                ))
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center text-gray-500 dark:text-gray-400">
                  {isLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่มีข้อมูล API Status'}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">สถานะระบบ AI</h2>
            <div className="space-y-3">
              {/* แสดงสถานะ GPU */}
              <GpuStatusCard backendName={backendName} isAvailable={isAvailable} />
              
              {/* แสดงสถานะโมเดล */}
              {modelStatus.map((model, index) => (
                <StatusCard 
                  key={index}
                  name={model.name}
                  status={model.status}
                  details={model.details}
                  lastChecked={model.lastChecked}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">ความคืบหน้าการพัฒนา</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors duration-200">
            {featureStatus.map((feature, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{feature.name}</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {feature.status === 'completed' ? 'เสร็จสมบูรณ์' : 
                     feature.status === 'in_progress' ? 'กำลังพัฒนา' : 'ยังไม่เริ่ม'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${feature.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/register" className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              ไปยังหน้าลงทะเบียน
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
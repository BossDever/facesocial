'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '../components/ui/button';
import ThemeToggle from '../components/theme/ThemeToggle';
import apiService from '../services/api.service';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');  // ถ้ามีการระบุ id ให้แสดงโปรไฟล์ของผู้ใช้คนนั้น
  
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [faceDataStats, setFaceDataStats] = useState<any>({
    totalFaces: 0,
    accuracy: 0,
    lastUpdated: null
  });
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  
  // ข้อมูลจำลองสำหรับโพสต์
  const [posts, setPosts] = useState<any[]>([]);

  // ตรวจสอบ auth และดึงข้อมูลผู้ใช้
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // ตรวจสอบว่ามี token หรือไม่
        if (!apiService.hasAuthToken()) {
          router.push('/login');
          return;
        }
        
        // ถ้าเป็นโปรไฟล์ของผู้อื่น
        if (userId) {
          // จำลองการดึงข้อมูลผู้ใช้จาก API
          // ในอนาคตจะใช้ apiService.getUserById(userId)
          setUserData({
            id: userId,
            username: `user_${userId}`,
            firstName: 'ผู้ใช้',
            lastName: 'ทดสอบ',
            email: `user_${userId}@example.com`,
            bio: 'นี่คือข้อมูลโปรไฟล์ตัวอย่าง สำหรับผู้ใช้ทดสอบในระบบ FaceSocial',
            profileImage: null,
            isCurrentUser: false
          });
          
          // จำลองข้อมูลสถิติใบหน้า
          setFaceDataStats({
            totalFaces: 15,
            accuracy: 96.3,
            lastUpdated: new Date().toLocaleDateString(),
            isShared: true
          });
          
          // จำลองข้อมูลบันทึกการเข้าถึง
          setAccessLogs([
            { id: 1, type: 'entry', location: 'ประตูหน้า', timestamp: '2025-02-28 08:45:32' },
            { id: 2, type: 'exit', location: 'ประตูหน้า', timestamp: '2025-02-28 17:30:15' },
            { id: 3, type: 'entry', location: 'ประตูหน้า', timestamp: '2025-02-29 08:52:41' }
          ]);
        } else {
          // ดึงข้อมูลของผู้ใช้ปัจจุบัน
          // ในอนาคตจะใช้ apiService.getCurrentUser()
          
          // ดึงข้อมูลจาก localStorage (ที่อาจบันทึกไว้จากหน้าตั้งค่าโปรไฟล์)
          const storedUserData = localStorage.getItem('userData');
          let userData = storedUserData ? JSON.parse(storedUserData) : null;
          
          // ถ้าไม่มีข้อมูลใน localStorage ใช้ข้อมูลจำลอง
          if (!userData) {
            userData = {
              id: 'current-user',
              username: 'current_user',
              firstName: '',
              lastName: '', 
              email: 'user@example.com',
              bio: '',
              profileImage: null
            };
          }
          
          // เพิ่มฟิลด์เพื่อระบุว่าเป็นผู้ใช้ปัจจุบัน
          userData.isCurrentUser = true;
          
          setUserData(userData);
          
          // จำลองข้อมูลสถิติใบหน้า
          setFaceDataStats({
            totalFaces: 28,
            accuracy: 98.7,
            lastUpdated: new Date().toLocaleDateString(),
            isShared: false
          });
          
          // จำลองข้อมูลบันทึกการเข้าถึง
          setAccessLogs([
            { id: 1, type: 'entry', location: 'ประตูหน้า', timestamp: '2025-02-28 08:45:32' },
            { id: 2, type: 'exit', location: 'ประตูหน้า', timestamp: '2025-02-28 17:30:15' },
            { id: 3, type: 'entry', location: 'ประตูหน้า', timestamp: '2025-02-29 08:52:41' },
            { id: 4, type: 'login', location: 'เว็บไซต์', timestamp: '2025-02-29 20:15:22' },
            { id: 5, type: 'entry', location: 'ประตูหน้า', timestamp: '2025-03-01 09:01:05' }
          ]);
          
          // ตรวจสอบว่าเป็นการเข้าใช้งานครั้งแรกหรือไม่
          const isProfileCompleted = userData.firstName && userData.lastName;
          if (!isProfileCompleted) {
            // ถ้ายังไม่ได้กรอกข้อมูลสำคัญ ให้นำทางไปยังหน้าตั้งค่าโปรไฟล์
            router.push('/profile/settings?first_time=true');
            return;
          }
        }
        
        // จำลองการดึงโพสต์
        // ในอนาคตจะใช้ apiService.getUserPosts(userId || 'current')
        const mockPosts = [
          {
            id: '1',
            content: 'ทดสอบระบบจดจำใบหน้าของ FaceSocial กันหน่อย! ความแม่นยำสูงมาก #FaceRecognition',
            createdAt: new Date().toLocaleDateString(),
            images: ['https://source.unsplash.com/random/800x600/?technology'],
            faceTags: [
              { id: 1, name: 'สมชาย ใจดี', position: { x: 200, y: 150, width: 60, height: 60 } }
            ],
            likes: 15,
            comments: 3
          },
          {
            id: '2',
            content: 'วันนี้ติดตั้งระบบบันทึกเวลาทำงานใหม่ให้สำนักงาน ตอนนี้พนักงานไม่ต้องกดบัตรแล้ว เข้าออกตรวจจับใบหน้าอัตโนมัติ!',
            createdAt: new Date(Date.now() - 86400000).toLocaleDateString(),
            images: ['https://source.unsplash.com/random/800x600/?office'],
            faceTags: [
              { id: 1, name: 'สมชาย ใจดี', position: { x: 150, y: 120, width: 50, height: 50 } },
              { id: 2, name: 'สมศรี มีทรัพย์', position: { x: 350, y: 130, width: 55, height: 55 } }
            ],
            likes: 42,
            comments: 8
          },
          {
            id: '3',
            content: 'ติดตั้งกล้องวงจรปิดอัจฉริยะของ FaceSocial ในอาคารสำนักงานเสร็จแล้ว ระบบตรวจจับใบหน้าทำงานได้เร็วมาก #CCTV #FaceRecognition',
            createdAt: new Date(Date.now() - 172800000).toLocaleDateString(),
            images: ['https://source.unsplash.com/random/800x600/?security'],
            likes: 7,
            comments: 1
          }
        ];
        
        setPosts(mockPosts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, router]);
  
  const handleExpandImage = (imageUrl: string) => {
    setExpandedImageUrl(imageUrl);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{error}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">โปรดลองอีกครั้งในภายหลัง</p>
          <Button onClick={() => router.push('/')}>กลับไปหน้าหลัก</Button>
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
              
              <div className="flex items-center">
                <Link href="/feed">
                  <Button variant="outline">กลับไปหน้าฟีด</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Profile section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile image */}
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0">
                {userData?.profileImage ? (
                  <img 
                    src={userData.profileImage} 
                    alt={`${userData.firstName} ${userData.lastName}`} 
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
              
              {/* Profile info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userData.firstName} {userData.lastName}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">@{userData.username}</p>
                
                {userData.bio && (
                  <div className="mt-2 mb-4">
                    <p className="text-gray-700 dark:text-gray-300">{userData.bio}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="font-bold">{posts.length}</span> โพสต์
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="font-bold">{faceDataStats.totalFaces}</span> ข้อมูลใบหน้า
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="font-bold">120</span> ผู้ติดตาม
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="font-bold">86</span> กำลังติดตาม
                  </div>
                </div>
                
                {/* Face recognition accuracy */}
                <div className="mt-3 max-w-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ความแม่นยำการจดจำใบหน้า</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{faceDataStats.accuracy}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${faceDataStats.accuracy}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    อัปเดตล่าสุด: {faceDataStats.lastUpdated}
                  </p>
                </div>
                
                {/* Edit profile button / Follow button */}
                <div className="mt-6">
                  {userData.isCurrentUser ? (
                    <div className="flex flex-wrap gap-2">
                      <Link href="/profile/settings">
                        <Button variant="outline">
                          แก้ไขโปรไฟล์
                        </Button>
                      </Link>
                      <Link href="/profile/faces">
                        <Button variant="outline">
                          จัดการข้อมูลใบหน้า
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button>
                        ติดตาม
                      </Button>
                      <Button variant="outline">
                        ข้อความ
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button 
                className={`flex-1 py-4 text-center font-medium border-b-2 ${
                  activeTab === 'posts' 
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('posts')}
              >
                โพสต์
              </button>
              <button 
                className={`flex-1 py-4 text-center font-medium border-b-2 ${
                  activeTab === 'face-data' 
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('face-data')}
              >
                ข้อมูลใบหน้า
              </button>
              <button 
                className={`flex-1 py-4 text-center font-medium border-b-2 ${
                  activeTab === 'access-logs' 
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('access-logs')}
              >
                ประวัติการเข้า-ออก
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab content */}
        <div className="mt-6">
          {/* Posts tab */}
          {activeTab === 'posts' && (
            <>
              {posts.length === 0 ? (
                <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">ยังไม่มีโพสต์</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 mr-3">
                          {userData?.profileImage ? (
                            <img 
                              src={userData.profileImage} 
                              alt={`${userData.firstName} ${userData.lastName}`} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{userData.firstName} {userData.lastName}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{post.createdAt}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{post.content}</p>
                      
                      {/* Post images with face tags */}
                      {post.images && post.images.length > 0 && (
                        <div className="mb-4">
                          {post.images.map((image, imageIndex) => (
                            <div 
                              key={imageIndex} 
                              className="relative rounded-lg overflow-hidden cursor-pointer"
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
                      
                      <div className="flex space-x-4 text-sm">
                        <button className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {post.likes} ถูกใจ
                        </button>
                        <button className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {post.comments} ความคิดเห็น
                        </button>
                        {/* ปุ่มแท็กใบหน้า */}
                        {post.images && post.images.length > 0 && post.faceTags && post.faceTags.length > 0 && (
                          <button className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {post.faceTags.length} แท็ก
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {/* Face data tab */}
          {activeTab === 'face-data' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">ข้อมูลใบหน้า</h3>
              
              {/* Face data stats */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="text-xl font-bold text-gray-700 dark:text-gray-200">
                      {faceDataStats.totalFaces}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ใบหน้าที่บันทึกไว้
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="text-xl font-bold text-gray-700 dark:text-gray-200">
                      {faceDataStats.accuracy}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ความแม่นยำในการจดจำ
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="text-xl font-bold text-gray-700 dark:text-gray-200">
                      {userData.isCurrentUser ? 28 : 15}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ครั้งที่ถูกตรวจจับ
                    </div>
                  </div>
                </div>
                
                {/* Sample face images (mock data) */}
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    ตัวอย่างข้อมูลใบหน้า
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-600 rounded-md overflow-hidden">
                        <img
                          src={`https://source.unsplash.com/random/200x200/?face&sig=${i}`}
                          alt={`Sample face ${i+1}`}
                          className="w-full h-full object-cover"
                          onClick={() => handleExpandImage(`https://source.unsplash.com/random/800x800/?face&sig=${i}`)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Privacy settings */}
                {userData.isCurrentUser && (
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                      การตั้งค่าความเป็นส่วนตัว
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-gray-700 dark:text-gray-300">แชร์ข้อมูลใบหน้ากับทีม</label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            name="toggle"
                            id="toggle-team-sharing"
                            checked={faceDataStats.isShared}
                            onChange={() => setFaceDataStats({ ...faceDataStats, isShared: !faceDataStats.isShared })}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                          />
                          <label
                            htmlFor="toggle-team-sharing"
                            className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                              faceDataStats.isShared ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          ></label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-gray-700 dark:text-gray-300">อนุญาตให้แท็กใบหน้าในโพสต์</label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            name="toggle"
                            id="toggle-face-tag"
                            checked={true}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                          />
                          <label
                            htmlFor="toggle-face-tag"
                            className="toggle-label block overflow-hidden h-6 rounded-full bg-blue-500 cursor-pointer"
                          ></label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-gray-700 dark:text-gray-300">อนุญาตให้ใช้ในระบบบันทึกเวลาทำงาน</label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            name="toggle"
                            id="toggle-attendance"
                            checked={true}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                          />
                          <label
                            htmlFor="toggle-attendance"
                            className="toggle-label block overflow-hidden h-6 rounded-full bg-blue-500 cursor-pointer"
                          ></label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Link href="/profile/faces">
                        <Button variant="outline">
                          จัดการข้อมูลใบหน้าทั้งหมด
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Access logs tab */}
          {activeTab === 'access-logs' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">ประวัติการเข้า-ออก</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ประเภท
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        สถานที่
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        เวลา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {accessLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              log.type === 'entry' ? 'bg-green-500' : 
                              log.type === 'exit' ? 'bg-red-500' : 
                              'bg-blue-500'
                            }`}></div>
                            <span className="text-sm text-gray-900 dark:text-gray-200">
                              {log.type === 'entry' ? 'เข้า' : 
                               log.type === 'exit' ? 'ออก' : 
                               log.type === 'login' ? 'เข้าสู่ระบบ' : 
                               'ไม่ทราบ'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {log.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {log.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                            สำเร็จ
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {userData.isCurrentUser && accessLogs.length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/profile/access-logs">
                    <Button variant="outline">
                      ดูประวัติทั้งหมด
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
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
      
      {/* Custom styles for toggle switch */}
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #3B82F6;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #3B82F6;
        }
        .toggle-checkbox {
          right: 0;
          z-index: 1;
          border-color: #D1D5DB;
          transition: all 0.3s;
        }
        .toggle-label {
          width: 100%;
          transition: background-color 0.3s;
        }
      `}</style>
    </div>
  );
}
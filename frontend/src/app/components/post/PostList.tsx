'use client';

import React, { useState, useEffect } from 'react';
import apiService from '@/app/services/api.service';
import PostCard from './PostCard';

interface PostListProps {
  userId?: string; // ถ้ากำหนด จะดึงเฉพาะโพสต์ของผู้ใช้รายนั้น
  initialPosts?: any[]; // โพสต์เริ่มต้นที่อาจส่งมาจาก Server Components
}

const PostList: React.FC<PostListProps> = ({ userId, initialPosts = [] }) => {
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(initialPosts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ดึงข้อมูลโพสต์เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    if (initialPosts.length === 0) {
      fetchPosts();
    }
  }, []);

  // ฟังก์ชันดึงข้อมูลโพสต์
  const fetchPosts = async (resetPage = true) => {
    if (resetPage) {
      setIsLoading(true);
      setPage(1);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);
    
    try {
      // เลือกว่าจะดึงโพสต์ทั้งหมดหรือโพสต์ของผู้ใช้เฉพาะราย
      const currentPage = resetPage ? 1 : page;
      
      let response;
      if (userId) {
        response = await apiService.getUserPosts(userId, currentPage, 10);
      } else {
        response = await apiService.getPosts(currentPage, 10);
      }
      
      // อัปเดตรายการโพสต์
      if (resetPage) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      
      // ตรวจสอบว่ามีหน้าถัดไปหรือไม่
      setHasMore(response.pagination.hasNext);
      
      // ถ้ามีหน้าถัดไป เพิ่มหมายเลขหน้า
      if (response.pagination.hasNext) {
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงโพสต์:', error);
      setError('ไม่สามารถโหลดโพสต์ได้ โปรดลองอีกครั้ง');
    } finally {
      if (resetPage) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // โหลดเพิ่มเติมเมื่อผู้ใช้เลื่อนลงมาถึงปุ่ม "โหลดเพิ่มเติม"
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(false);
    }
  };

  // แสดงสถานะกำลังโหลด
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // แสดงข้อความเมื่อมีข้อผิดพลาด
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 my-4">
        <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => fetchPosts()}
            className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // แสดงข้อความเมื่อไม่มีโพสต์
  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 my-4 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {userId ? 'ผู้ใช้นี้ยังไม่มีโพสต์' : 'ยังไม่มีโพสต์ในขณะนี้'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          id={post.id}
          content={post.content}
          createdAt={post.createdAt}
          user={post.user}
          media={post.media || []}
          likeCount={post._count?.likes || 0}
          commentCount={post._count?.comments || 0}
          isLiked={post.isLiked || false}
          comments={post.comments || []}
        />
      ))}
      
      {/* ปุ่มโหลดเพิ่มเติม */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-gray-700 dark:border-gray-300 rounded-full mr-2"></span>
                กำลังโหลด...
              </>
            ) : (
              'โหลดเพิ่มเติม'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PostList;
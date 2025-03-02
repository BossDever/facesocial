'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import apiService from '@/app/services/api.service';
import postService from '@/app/services/post.service';
import PostCard from '@/app/components/post/PostCard';
import CommentForm from '@/app/components/post/CommentForm';
import CommentList from '@/app/components/post/CommentList';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // ดึงข้อมูลโพสต์เมื่อโหลดหน้า
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // ดึงข้อมูลโพสต์
        const postData = await postService.getPostById(postId);
        setPost(postData);
        
        // ดึงความคิดเห็นของโพสต์
        if (postData.comments) {
          setComments(postData.comments);
        }
      } catch (error: any) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลโพสต์:', error);
        
        if (error.response?.status === 404) {
          setError('ไม่พบโพสต์ที่คุณกำลังค้นหา');
        } else {
          setError('เกิดข้อผิดพลาดในการโหลดโพสต์ โปรดลองอีกครั้ง');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPostData();
  }, [postId]);

  // โหลดความคิดเห็นเพิ่มเติม
  const handleLoadMoreComments = async () => {
    if (!postId || isLoadingComments) return;
    
    setIsLoadingComments(true);
    
    try {
      // หน้าที่ต้องการโหลด (หน้าถัดไปจากที่มีอยู่)
      const nextPage = Math.ceil(comments.length / 10) + 1;
      const response = await postService.getPostComments(postId, nextPage);
      
      if (response.comments && response.comments.length > 0) {
        setComments(prev => [...prev, ...response.comments]);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดความคิดเห็นเพิ่มเติม:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // เพิ่มความคิดเห็นใหม่
  const handleAddComment = (newComment: any) => {
    setComments(prev => [newComment, ...prev]);
    
    // อัปเดตจำนวนความคิดเห็นในโพสต์
    if (post && post._count) {
      setPost({
        ...post,
        _count: {
          ...post._count,
          comments: (post._count.comments || 0) + 1
        }
      });
    }
  };

  // แสดงสถานะกำลังโหลด
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">กำลังโหลดโพสต์...</p>
        </div>
      </div>
    );
  }

  // แสดงข้อความเมื่อมีข้อผิดพลาด
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
            <div className="flex justify-center space-x-3">
              <Link href="/feed" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                กลับไปหน้าฟีด
              </Link>
              <button
                onClick={() => router.refresh()}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // แสดงข้อความเมื่อไม่พบโพสต์
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ไม่พบโพสต์</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">โพสต์นี้อาจถูกลบไปแล้ว หรือคุณอาจไม่มีสิทธิ์เข้าถึง</p>
            <Link href="/feed" className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              กลับไปหน้าฟีด
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-4">
        {/* ปุ่มกลับ */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>กลับ</span>
          </button>
        </div>
        
        {/* โพสต์ */}
        <div className="mb-6">
          <PostCard
            id={post.id}
            content={post.content}
            createdAt={post.createdAt}
            user={post.user}
            media={post.media || []}
            likeCount={post._count?.likes || 0}
            commentCount={post._count?.comments || 0}
            isLiked={post.isLiked || false}
            comments={[]}
          />
        </div>
        
        {/* ส่วนความคิดเห็น */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">ความคิดเห็น ({post._count?.comments || 0})</h2>
          
          {/* ฟอร์มสำหรับส่งความคิดเห็น */}
          <div className="mb-6">
            <CommentForm postId={post.id} onCommentAdded={handleAddComment} />
          </div>
          
          {/* รายการความคิดเห็น */}
          {comments.length > 0 ? (
            <CommentList comments={comments} />
          ) : (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น
            </div>
          )}
          
          {/* ปุ่มโหลดความคิดเห็นเพิ่มเติม */}
          {post._count?.comments > comments.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMoreComments}
                disabled={isLoadingComments}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {isLoadingComments ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-gray-700 dark:border-gray-300 rounded-full mr-2"></span>
                    กำลังโหลด...
                  </>
                ) : (
                  'โหลดความคิดเห็นเพิ่มเติม'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
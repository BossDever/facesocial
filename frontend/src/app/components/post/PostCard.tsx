'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import apiService from '@/app/services/api.service';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

interface FaceTag {
  id: string;
  userId: string;
  userName: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Media {
  id: string;
  type: 'image' | 'video';
  url: string;
  faceTags?: FaceTag[];
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface PostProps {
  id: string;
  content: string;
  createdAt: string;
  user: User;
  media: Media[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments?: Comment[];
}

const PostCard: React.FC<PostProps> = ({
  id,
  content,
  createdAt,
  user,
  media,
  likeCount: initialLikeCount,
  commentCount: initialCommentCount,
  isLiked: initialIsLiked,
  comments: initialComments = []
}) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  // คำนวณเวลาที่โพสต์ เช่น "3 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว"
  const timeAgo = () => {
    try {
      return formatDistanceToNow(new Date(createdAt), { 
        addSuffix: true,
        locale: th 
      });
    } catch (error) {
      return 'เมื่อไม่นานมานี้';
    }
  };

  // จัดการการกดไลค์
  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    
    setIsLikeLoading(true);
    try {
      if (isLiked) {
        // ยกเลิกการไลค์
        const response = await apiService.unlikePost(id);
        setLikeCount(response.likeCount);
        setIsLiked(false);
      } else {
        // กดไลค์
        const response = await apiService.likePost(id);
        setLikeCount(response.likeCount);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการกดไลค์:', error);
      // ในกรณีที่ API ล้มเหลว ทำการอัปเดตแบบ optimistic UI
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // โหลดความคิดเห็นเมื่อผู้ใช้กดดูความคิดเห็น
  const fetchComments = async () => {
    if (showComments || comments.length > 0) {
      setShowComments(!showComments);
      return;
    }
    
    setIsCommentsLoading(true);
    try {
      const postData = await apiService.getPostById(id);
      if (postData.comments) {
        setComments(postData.comments);
      }
      setShowComments(true);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดความคิดเห็น:', error);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  // เพิ่มความคิดเห็นใหม่ลงในรายการ
  const handleAddComment = (newComment: Comment) => {
    setComments(prev => [newComment, ...prev]);
    setShowComments(true);
  };

  // แก้ไขการแสดงผล URL ของรูปภาพหรือวิดีโอ
  const getMediaUrl = (url: string): string => {
    // ตรวจสอบว่า URL เริ่มต้นด้วย http หรือ https หรือไม่
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // ถ้าเริ่มต้นด้วย /uploads ให้เพิ่ม /api นำหน้า
    if (url.startsWith('/uploads/')) {
      return `/api${url}`;
    }

    // ถ้าไม่ตรงกับกรณีข้างต้น ให้เพิ่ม /api นำหน้า
    return `/api${url}`;
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden">
      {/* ส่วนหัวของโพสต์ */}
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${user.id}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {user.profileImage ? (
                <Image 
                  src={getMediaUrl(user.profileImage)}
                  alt={`${user.firstName} ${user.lastName}`}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-lg font-bold">
                  {user.firstName ? user.firstName.charAt(0) : user.username?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${user.id}`} className="hover:underline">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </h3>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              @{user.username} · {timeAgo()}
            </p>
          </div>
          
          {/* ปุ่มตัวเลือกเพิ่มเติม (ถ้าต้องการ) */}
          <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
        
        {/* เนื้อหาโพสต์ */}
        <div className="mt-3">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
      
      {/* รูปภาพและวิดีโอในโพสต์ */}
      {media && media.length > 0 && (
        <div className={`grid ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1`}>
          {media.map((item, index) => (
            <div key={item.id || index} className="relative">
              {item.type === 'image' ? (
                <div 
                  className="cursor-pointer aspect-video relative overflow-hidden"
                  onClick={() => setExpandedImageUrl(item.url)}
                >
                  <img 
                    src={getMediaUrl(item.url)}
                    alt={`โพสต์รูปภาพ ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* แสดง face tags ถ้ามี */}
                  {item.faceTags && item.faceTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="absolute border-2 border-blue-500 bg-blue-500/10"
                      style={{
                        left: `${tag.position.x}%`,
                        top: `${tag.position.y}%`,
                        width: `${tag.position.width}%`,
                        height: `${tag.position.height}%`
                      }}
                    >
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 truncate">
                        {tag.userName}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video relative">
                  <video 
                    src={getMediaUrl(item.url)}
                    controls
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* ปุ่มแสดงปฏิสัมพันธ์ (ไลค์, คอมเมนต์, แชร์) */}
      <div className="px-4 py-2 flex justify-between border-t border-gray-100 dark:border-gray-700">
        <button 
          onClick={fetchComments}
          className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{initialCommentCount + (comments.length - initialComments.length)}</span>
        </button>
        
        <button 
          onClick={handleLikeToggle}
          disabled={isLikeLoading}
          className={`flex items-center space-x-1 ${isLiked ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'}`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill={isLiked ? "currentColor" : "none"} 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{likeCount}</span>
        </button>
        
        <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>แชร์</span>
        </button>
      </div>
      
      {/* ส่วนความคิดเห็น */}
      {showComments && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <CommentForm postId={id} onCommentAdded={handleAddComment} />
          
          {isCommentsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <CommentList comments={comments} />
          )}
        </div>
      )}
      
      {/* Modal แสดงรูปภาพขยาย */}
      {expandedImageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <button 
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImageUrl(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={getMediaUrl(expandedImageUrl)}
                alt="รูปภาพขยาย"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
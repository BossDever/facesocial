'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

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

interface CommentListProps {
  comments: Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  // คำนวณเวลาที่คอมเมนต์ เช่น "3 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว"
  const timeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true,
        locale: th 
      });
    } catch (error) {
      return 'เมื่อไม่นานมานี้';
    }
  };

  // แก้ไขการแสดงผล URL ของรูปภาพ
  const getImageUrl = (url: string | null): string => {
    if (!url) return '';
    
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

  // แสดงข้อความเมื่อไม่มีความคิดเห็น
  if (comments.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 dark:text-gray-400">
        ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex space-x-3">
          <Link href={`/profile/${comment.user.id}`} className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {comment.user.profileImage ? (
                <img 
                  src={getImageUrl(comment.user.profileImage)}
                  alt={`${comment.user.firstName || ''} ${comment.user.lastName || ''}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-bold">
                  {comment.user.firstName ? comment.user.firstName.charAt(0) : comment.user.username?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </Link>
          
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <Link href={`/profile/${comment.user.id}`} className="hover:underline">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {comment.user.firstName && comment.user.lastName 
                    ? `${comment.user.firstName} ${comment.user.lastName}`
                    : comment.user.username}
                </h4>
              </Link>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
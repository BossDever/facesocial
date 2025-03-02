'use client';

import React, { useState } from 'react';
import apiService from '@/app/services/api.service';

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

interface CommentFormProps {
  postId: string;
  onCommentAdded: (comment: Comment) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ postId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ตรวจสอบว่ามีเนื้อหาหรือไม่
    if (!content.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // ส่งความคิดเห็นไปยัง API
      const response = await apiService.commentPost(postId, content);
      
      // ล้างฟอร์ม
      setContent('');
      
      // เรียกใช้ callback เพื่อเพิ่มความคิดเห็นใหม่ลงในรายการ
      onCommentAdded(response.comment);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการส่งความคิดเห็น:', error);
      setError('ไม่สามารถส่งความคิดเห็นได้ โปรดลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="เขียนความคิดเห็น..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          rows={2}
          disabled={isSubmitting}
        />
        
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={`absolute bottom-2 right-2 p-1 rounded-full ${
            !content.trim() || isSubmitting
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
          }`}
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blue-500"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      
      {error && (
        <p className="mt-1 text-red-500 text-sm">{error}</p>
      )}
    </form>
  );
};

export default CommentForm;
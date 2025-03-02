'use client';

import apiService from './api.service';
import { API_ENDPOINTS, replaceParams } from '../config/api.config';

/**
 * Post Service สำหรับการจัดการโพสต์
 */
class PostService {
  /**
   * ดึงโพสต์ทั้งหมด
   * @param page หน้าที่ต้องการ
   * @param limit จำนวนรายการต่อหน้า
   * @returns รายการโพสต์
   */
  async getPosts(page: number = 1, limit: number = 10): Promise<any> {
    try {
      return await apiService.getPosts(page, limit);
    } catch (error) {
      console.error('Failed to get posts:', error);
      throw error;
    }
  }
  
  /**
   * ดึงโพสต์ตาม ID
   * @param postId ID ของโพสต์
   * @returns ข้อมูลโพสต์
   */
  async getPostById(postId: string): Promise<any> {
    try {
      return await apiService.getPostById(postId);
    } catch (error) {
      console.error('Failed to get post by ID:', error);
      throw error;
    }
  }
  
  /**
   * สร้างโพสต์ใหม่
   * @param postData ข้อมูลโพสต์ (FormData หรือ Object)
   * @returns ข้อมูลโพสต์ที่สร้าง
   */
  async createPost(postData: FormData | any): Promise<any> {
    try {
      // ถ้าเป็น FormData ให้ใช้ API endpoint โดยตรง
      if (postData instanceof FormData) {
        return await apiService.post(API_ENDPOINTS.POST.CREATE, postData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // ถ้าเป็น Object ปกติ
      return await apiService.createPost(postData);
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  }
  
  /**
   * ลบโพสต์
   * @param postId ID ของโพสต์
   * @returns สถานะการลบ
   */
  async deletePost(postId: string): Promise<any> {
    try {
      return await apiService.deletePost(postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  }
  
  /**
   * กดไลค์โพสต์
   * @param postId ID ของโพสต์
   * @returns สถานะการกดไลค์
   */
  async likePost(postId: string): Promise<any> {
    try {
      return await apiService.likePost(postId);
    } catch (error) {
      console.error('Failed to like post:', error);
      throw error;
    }
  }
  
  /**
   * ยกเลิกการกดไลค์โพสต์
   * @param postId ID ของโพสต์
   * @returns สถานะการยกเลิกการกดไลค์
   */
  async unlikePost(postId: string): Promise<any> {
    try {
      return await apiService.unlikePost(postId);
    } catch (error) {
      console.error('Failed to unlike post:', error);
      throw error;
    }
  }
  
  /**
   * แสดงความคิดเห็นในโพสต์
   * @param postId ID ของโพสต์
   * @param content เนื้อหาความคิดเห็น
   * @returns ข้อมูลความคิดเห็น
   */
  async commentPost(postId: string, content: string): Promise<any> {
    try {
      return await apiService.commentPost(postId, content);
    } catch (error) {
      console.error('Failed to comment post:', error);
      throw error;
    }
  }
  
  /**
   * ลบความคิดเห็น
   * @param postId ID ของโพสต์
   * @param commentId ID ของความคิดเห็น
   * @returns สถานะการลบ
   */
  async deleteComment(postId: string, commentId: string): Promise<any> {
    try {
      return await apiService.deleteComment(postId, commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }
  
  /**
   * ตรวจสอบว่าผู้ใช้กดไลค์โพสต์แล้วหรือไม่
   * @param postId ID ของโพสต์
   * @returns สถานะการกดไลค์
   */
  async checkPostLiked(postId: string): Promise<boolean> {
    try {
      const response = await apiService.get(`${API_ENDPOINTS.POST.CHECK_LIKED}/${postId}`);
      return response.isLiked;
    } catch (error) {
      console.error('Failed to check if post is liked:', error);
      // ถ้ามีข้อผิดพลาด ถือว่ายังไม่ได้กดไลค์
      return false;
    }
  }
  
  /**
   * ดึงจำนวนไลค์ของโพสต์
   * @param postId ID ของโพสต์
   * @returns จำนวนไลค์
   */
  async getPostLikeCount(postId: string): Promise<number> {
    try {
      const response = await apiService.get(`${API_ENDPOINTS.POST.GET_LIKE_COUNT}/${postId}`);
      return response.likeCount || 0;
    } catch (error) {
      console.error('Failed to get post like count:', error);
      return 0;
    }
  }
  
  /**
   * ดึงความคิดเห็นทั้งหมดของโพสต์
   * @param postId ID ของโพสต์
   * @param page หน้าที่ต้องการ
   * @param limit จำนวนรายการต่อหน้า
   * @returns รายการความคิดเห็น
   */
  async getPostComments(postId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await apiService.get(replaceParams(API_ENDPOINTS.POST.GET_COMMENTS, { id: postId }), {
        params: { page, limit }
      });
      return response;
    } catch (error) {
      console.error('Failed to get post comments:', error);
      throw error;
    }
  }
}

// สร้าง Singleton instance ของ PostService
const postService = new PostService();

export default postService;
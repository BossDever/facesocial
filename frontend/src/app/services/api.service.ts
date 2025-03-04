// frontend/src/app/services/api.service.ts

'use client';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  API_BASE_URL, 
  API_TIMEOUT, 
  DEFAULT_HEADERS, 
  API_ENDPOINTS,
  AUTH_TOKEN_KEY,
  USER_DATA_KEY,
  replaceParams
} from '../config/api.config';

/**
 * API Service สำหรับการเชื่อมต่อกับ Backend API
 */
class ApiService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  
  constructor() {
    // สร้าง axios instance
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: DEFAULT_HEADERS,
      timeout: API_TIMEOUT
    });
    
    // เพิ่ม request interceptor สำหรับการแนบ token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // ถ้ามี token ให้เพิ่มเข้าไปใน header
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        // แสดงข้อมูล URL ที่กำลังส่งคำขอ (debug)
        console.log(`กำลังส่งคำขอไปยัง: ${config.method?.toUpperCase()} ${config.url}`);
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // เพิ่ม response interceptor สำหรับการจัดการข้อผิดพลาด
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.message, error.response?.status);
        
        // จัดการกรณีที่ token หมดอายุ
        if (error.response && error.response.status === 401) {
          const isSessionExpired = error.response.data?.sessionExpired;
          
          // ล้าง token และ redirect ไปยังหน้า login
          this.clearAuthToken();
          
          // ถ้าอยู่ในฝั่ง client เท่านั้น
          if (typeof window !== 'undefined') {
            // ตรวจสอบว่าไม่ได้อยู่ในหน้า login อยู่แล้ว
            if (!window.location.pathname.includes('/login')) {
              window.location.href = isSessionExpired 
                ? '/login?session_expired=true'
                : '/login';
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // โหลด token และข้อมูลผู้ใช้จาก localStorage เมื่อสร้าง instance
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        this.authToken = storedToken;
      }
    }
  }
  
  /**
   * ตั้งค่า Auth Token
   * @param token JWT token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    
    // เก็บ token ลงใน localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  }
  
  /**
   * ล้าง Auth Token
   */
  clearAuthToken(): void {
    this.authToken = null;
    
    // ลบ token จาก localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY); // ลบข้อมูลผู้ใช้ด้วย
    }
  }
  
  /**
   * ตรวจสอบว่ามี token หรือไม่
   * @returns สถานะการมี token
   */
  hasAuthToken(): boolean {
    return !!this.authToken;
  }
  
  /**
   * ตรวจสอบสถานะการเชื่อมต่อกับ API
   * @returns ข้อมูลสถานะ API
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(API_ENDPOINTS.HEALTH);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลสถานะ API ทั้งหมด
   * @returns ข้อมูลสถานะ API
   */
  async getApiStatus(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(API_ENDPOINTS.AUTH.API_STATUS);
      return response.data;
    } catch (error) {
      console.error('Failed to get API status:', error);
      // แทนที่จะ throw error ให้คืนค่าสถานะจำลอง
      return [
        { 
          id: '1',
          name: 'Authentication API', 
          endpoint: '/api/auth', 
          status: 'active', 
          responseTime: 120,
          successRate: 99.8,
          lastChecked: new Date()
        },
        { 
          id: '2',
          name: 'User API', 
          endpoint: '/api/users', 
          status: 'active', 
          responseTime: 150,
          successRate: 99.5,
          lastChecked: new Date()
        },
        { 
          id: '3',
          name: 'Post API', 
          endpoint: '/api/posts', 
          status: 'active', 
          responseTime: 280,
          successRate: 98.7,
          lastChecked: new Date()
        },
        { 
          id: '4',
          name: 'Face Recognition API', 
          endpoint: '/api/face', 
          status: 'active', 
          responseTime: 180,
          successRate: 97.3,
          lastChecked: new Date()
        }
      ];
    }
  }
  
  /**
   * ตรวจสอบชื่อผู้ใช้ว่ามีในระบบแล้วหรือไม่
   * @param username ชื่อผู้ใช้ที่ต้องการตรวจสอบ
   * @returns สถานะการตรวจสอบ
   */
  async checkUsername(username: string): Promise<{ available: boolean; message: string }> {
    try {
      // ใช้เส้นทาง API ที่ถูกต้อง (แก้ไข)
      const response = await this.axiosInstance.get('/api/auth/check-username', {
        params: { username }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to check username:', error);
      
      // กรณีที่ API ยังไม่พร้อมใช้งาน ให้จำลองการตรวจสอบโดยดูว่าชื่อผู้ใช้เป็น admin หรือไม่
      if (username.toLowerCase() === 'admin') {
        return {
          available: false,
          message: 'ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว'
        };
      }
      
      // สำหรับชื่อผู้ใช้อื่น ๆ ให้สมมติว่าใช้ได้
      return {
        available: true,
        message: 'ชื่อผู้ใช้นี้สามารถใช้งานได้'
      };
    }
  }
  
  /**
   * ลงทะเบียนผู้ใช้ใหม่
   * @param userData ข้อมูลผู้ใช้ (username, email, password, firstName, lastName)
   * @returns ข้อมูลผู้ใช้ที่ลงทะเบียนแล้ว
   */
  async registerUser(userData: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      
      // เก็บ token หลังจากลงทะเบียนสำเร็จ
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      // เก็บข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }
  
  /**
   * บันทึกข้อมูลใบหน้าของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @param faceData ข้อมูลใบหน้า (embeddings, imageBase64, score)
   * @returns ข้อมูลใบหน้าที่บันทึกแล้ว
   */
  async storeFaceData(userId: string, faceData: any): Promise<any> {
    try {
      const endpoint = `${API_ENDPOINTS.AUTH.STORE_FACE_DATA}/${userId}`;
      
      // แสดงข้อมูลการส่งคำขอ (debug)
      console.log('กำลังบันทึกข้อมูลใบหน้า:', {
        userId,
        endpoint,
        embeddingsLength: faceData.embeddings?.length
      });
      
      const response = await this.axiosInstance.post(endpoint, faceData);
      return response.data;
    } catch (error) {
      console.error('Failed to store face data:', error);
      throw error;
    }
  }
  
  /**
   * เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน
   * @param credentials ข้อมูลการเข้าสู่ระบบ (username, password)
   * @returns ข้อมูลการเข้าสู่ระบบและ token
   */
  async login(credentials: { username: string, password: string }): Promise<any> {
    try {
      const response = await this.axiosInstance.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      
      // เก็บ token หลังจากเข้าสู่ระบบสำเร็จ
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      // เก็บข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }
  
  /**
   * เข้าสู่ระบบด้วยใบหน้า
   * @param faceData ข้อมูลใบหน้า (embeddings, imageBase64)
   * @returns ข้อมูลการเข้าสู่ระบบและ token
   */
  async loginWithFace(faceData: { embeddings: number[], imageBase64: string }): Promise<any> {
    try {
      // แสดงข้อมูลขนาดของ embeddings (debug)
      console.log('กำลังส่งข้อมูลเข้าสู่ระบบด้วยใบหน้า:', {
        embeddingsLength: faceData.embeddings.length,
        imageBase64Length: faceData.imageBase64.length
      });
      
      const response = await this.axiosInstance.post(API_ENDPOINTS.AUTH.LOGIN_FACE, faceData);
      
      // เก็บ token หลังจากเข้าสู่ระบบสำเร็จ
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      // เก็บข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Face login failed:', error);
      throw error;
    }
  }
  
  /**
   * ออกจากระบบ
   * @returns สถานะการออกจากระบบ
   */
  async logout(): Promise<any> {
    try {
      const response = await this.axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
      
      // ล้าง token หลังจากออกจากระบบ
      this.clearAuthToken();
      
      // ล้างข้อมูลผู้ใช้จาก localStorage
      localStorage.removeItem(USER_DATA_KEY);
      
      return response.data;
    } catch (error) {
      // ล้าง token แม้ว่าจะมีข้อผิดพลาด
      this.clearAuthToken();
      
      // ล้างข้อมูลผู้ใช้จาก localStorage
      localStorage.removeItem(USER_DATA_KEY);
      
      console.warn('Logout error:', error);
      return { success: true, message: 'ออกจากระบบสำเร็จ (ล้าง token แล้ว)' };
    }
  }
  
  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน
   * @returns ข้อมูลผู้ใช้
   */
  async getCurrentUser(): Promise<any> {
    try {
      // ลองดึงข้อมูลจาก API ก่อน
      try {
        const response = await this.axiosInstance.get(API_ENDPOINTS.AUTH.CURRENT_USER);
        
        // อัปเดตข้อมูลผู้ใช้ใน localStorage
        if (response.data) {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data));
          return response.data;
        }
      } catch (apiError) {
        console.warn('API getCurrentUser failed, using localStorage fallback:', apiError);
        // กรณี API ล้มเหลว ลองใช้ข้อมูลจาก localStorage แทน
      }
      
      // ถ้า API ล้มเหลว ดึงข้อมูลจาก localStorage
      const storedUserData = localStorage.getItem(USER_DATA_KEY);
      if (storedUserData) {
        return JSON.parse(storedUserData);
      }
      
      // ถ้าไม่มีข้อมูลใน localStorage ให้ throw error
      throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ');
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลผู้ใช้โดย ID
   * @param userId ID ของผู้ใช้
   * @returns ข้อมูลผู้ใช้
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const endpoint = `${API_ENDPOINTS.USER.GET_BY_ID}/${userId}`;
      const response = await this.axiosInstance.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลใบหน้าของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @returns ข้อมูลใบหน้าของผู้ใช้
   */
  async getUserFaces(userId: string): Promise<any> {
    try {
      const endpoint = replaceParams(API_ENDPOINTS.USER.GET_FACES, { id: userId });
      const response = await this.axiosInstance.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to get user faces:', error);
      throw error;
    }
  }
  
  /**
   * ดึงโพสต์ของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @param page หน้าที่ต้องการ
   * @param limit จำนวนรายการต่อหน้า
   * @returns โพสต์ของผู้ใช้
   */
  async getUserPosts(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const endpoint = replaceParams(API_ENDPOINTS.USER.GET_POSTS, { id: userId });
      const response = await this.axiosInstance.get(endpoint, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get user posts:', error);
      throw error;
    }
  }
  
  /**
   * อัปเดตข้อมูลโปรไฟล์ผู้ใช้
   * @param profileData ข้อมูลโปรไฟล์ใหม่
   * @returns ข้อมูลผู้ใช้ที่อัปเดตแล้ว
   */
  async updateUserProfile(profileData: any): Promise<any> {
    try {
      const response = await this.axiosInstance.patch(API_ENDPOINTS.AUTH.UPDATE_PROFILE, profileData);
      
      // อัปเดตข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        const currentUserData = JSON.parse(localStorage.getItem(USER_DATA_KEY) || '{}');
        const updatedUserData = {
          ...currentUserData,
          ...response.data.user
        };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUserData));
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }
  
  /**
   * ติดตามผู้ใช้
   * @param userId ID ของผู้ใช้ที่ต้องการติดตาม
   * @returns สถานะการติดตาม
   */
  async followUser(userId: string): Promise<any> {
    try {
      const endpoint = replaceParams(API_ENDPOINTS.USER.FOLLOW, { id: userId });
      const response = await this.axiosInstance.post(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to follow user:', error);
      throw error;
    }
  }
  
  /**
   * เลิกติดตามผู้ใช้
   * @param userId ID ของผู้ใช้ที่ต้องการเลิกติดตาม
   * @returns สถานะการเลิกติดตาม
   */
  async unfollowUser(userId: string): Promise<any> {
    try {
      const endpoint = replaceParams(API_ENDPOINTS.USER.UNFOLLOW, { id: userId });
      const response = await this.axiosInstance.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      throw error;
    }
  }
  
  /**
   * ดึงโพสต์ทั้งหมด
   * @param page หน้าที่ต้องการ
   * @param limit จำนวนรายการต่อหน้า
   * @returns รายการโพสต์
   */
  async getPosts(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await this.axiosInstance.get(API_ENDPOINTS.POST.GET_ALL, {
        params: { page, limit }
      });
      return response.data;
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
      const endpoint = replaceParams(API_ENDPOINTS.POST.GET_BY_ID, { id: postId });
      const response = await this.axiosInstance.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to get post by ID:', error);
      throw error;
    }
  }
  
  /**
   * สร้างโพสต์ใหม่
   * @param postData ข้อมูลโพสต์ (content, media)
   * @returns ข้อมูลโพสต์ที่สร้าง
   */
  async createPost(postData: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post(API_ENDPOINTS.POST.CREATE, postData);
      return response.data;
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
      const endpoint = replaceParams(API_ENDPOINTS.POST.DELETE, { id: postId });
      const response = await this.axiosInstance.delete(endpoint);
      return response.data;
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
      const endpoint = replaceParams(API_ENDPOINTS.POST.LIKE, { id: postId });
      const response = await this.axiosInstance.post(endpoint);
      return response.data;
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
      const endpoint = replaceParams(API_ENDPOINTS.POST.UNLIKE, { id: postId });
      const response = await this.axiosInstance.delete(endpoint);
      return response.data;
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
      const endpoint = replaceParams(API_ENDPOINTS.POST.COMMENT, { id: postId });
      const response = await this.axiosInstance.post(endpoint, { content });
      return response.data;
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
      const endpoint = replaceParams(API_ENDPOINTS.POST.DELETE_COMMENT, { id: postId, commentId });
      const response = await this.axiosInstance.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }
  
  /**
   * Generic GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET request to ${url} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Generic POST request
   */
  async post<T = any>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST request to ${url} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Generic PUT request
   */
  async put<T = any>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT request to ${url} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Generic PATCH request
   */
  async patch<T = any>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PATCH request to ${url} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Generic DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE request to ${url} failed:`, error);
      throw error;
    }
  }
}

// สร้าง Singleton instance ของ ApiService
const apiService = new ApiService();

export default apiService;
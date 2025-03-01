// อัปเดตไฟล์ frontend/src/app/services/api.service.ts

'use client';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * API Service สำหรับการเชื่อมต่อกับ Backend API
 */
class ApiService {
  private axiosInstance: AxiosInstance;
  private readonly API_BASE_URL: string;
  private authToken: string | null = null;
  
  constructor() {
    // กำหนด URL ของ API
    this.API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    
    // สร้าง axios instance
    this.axiosInstance = axios.create({
      baseURL: this.API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 วินาที
    });
    
    // เพิ่ม request interceptor สำหรับการแนบ token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // ถ้ามี token ให้เพิ่มเข้าไปใน header
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
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
        console.error('API Error:', error);
        
        // จัดการกรณีที่ token หมดอายุ
        if (error.response && error.response.status === 401) {
          const isSessionExpired = error.response.data.sessionExpired;
          
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
    
    // โหลด token จาก localStorage เมื่อสร้าง instance
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('authToken');
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
      localStorage.setItem('authToken', token);
    }
  }
  
  /**
   * ล้าง Auth Token
   */
  clearAuthToken(): void {
    this.authToken = null;
    
    // ลบ token จาก localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
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
      const response = await this.axiosInstance.get('/health');
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
      const response = await this.axiosInstance.get('/auth/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get API status:', error);
      throw error;
    }
  }
  
  /**
   * ลงทะเบียนผู้ใช้ใหม่
   * @param userData ข้อมูลผู้ใช้ (username, email, password, firstName, lastName)
   * @returns ข้อมูลผู้ใช้ที่ลงทะเบียนแล้ว
   */
  async registerUser(userData: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/auth/register', userData);
      
      // เก็บ token หลังจากลงทะเบียนสำเร็จ
      if (response.data.token) {
        this.setAuthToken(response.data.token);
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
      const response = await this.axiosInstance.post(`/auth/face-data/${userId}`, faceData);
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
      const response = await this.axiosInstance.post('/auth/login', credentials);
      
      // เก็บ token หลังจากเข้าสู่ระบบสำเร็จ
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      // เก็บข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        localStorage.setItem('userData', JSON.stringify(response.data.user));
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
      const response = await this.axiosInstance.post('/auth/login-face', faceData);
      
      // เก็บ token หลังจากเข้าสู่ระบบสำเร็จ
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      // เก็บข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        localStorage.setItem('userData', JSON.stringify(response.data.user));
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
      const response = await this.axiosInstance.post('/auth/logout');
      
      // ล้าง token หลังจากออกจากระบบ
      this.clearAuthToken();
      
      // ล้างข้อมูลผู้ใช้จาก localStorage
      localStorage.removeItem('userData');
      
      return response.data;
    } catch (error) {
      // ล้าง token แม้ว่าจะมีข้อผิดพลาด
      this.clearAuthToken();
      
      // ล้างข้อมูลผู้ใช้จาก localStorage
      localStorage.removeItem('userData');
      
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
      const response = await this.axiosInstance.get('/auth/me');
      
      // อัปเดตข้อมูลผู้ใช้ใน localStorage
      localStorage.setItem('userData', JSON.stringify(response.data));
      
      return response.data;
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
      const response = await this.axiosInstance.get(`/users/${userId}`);
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
      const response = await this.axiosInstance.get(`/users/${userId}/faces`);
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
      const response = await this.axiosInstance.get(`/users/${userId}/posts`, {
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
      const response = await this.axiosInstance.patch('/auth/profile', profileData);
      
      // อัปเดตข้อมูลผู้ใช้ใน localStorage
      if (response.data.user) {
        const currentUserData = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem('userData', JSON.stringify({
          ...currentUserData,
          ...response.data.user
        }));
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
      const response = await this.axiosInstance.post(`/users/${userId}/follow`);
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
      const response = await this.axiosInstance.delete(`/users/${userId}/follow`);
      return response.data;
    } catch (error) {
      console.error('Failed to unfollow user:', error);
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
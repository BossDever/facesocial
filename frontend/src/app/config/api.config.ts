// frontend/src/app/config/api.config.ts

/**
 * การตั้งค่า API สำหรับการเชื่อมต่อระหว่าง Frontend และ Backend
 */

/**
 * URL หลักของ Backend API
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * URL ของ FaceNet API
 */
export const FACENET_API_URL = process.env.NEXT_PUBLIC_FACENET_API_URL || 'http://localhost:8000';

/**
 * ค่า timeout สำหรับการเรียกใช้ API (มิลลิวินาที)
 */
export const API_TIMEOUT = 30000; // 30 วินาที

/**
 * ชื่อสำหรับ localStorage token
 */
export const AUTH_TOKEN_KEY = 'facesocial_auth_token';

/**
 * ชื่อสำหรับ localStorage user data
 */
export const USER_DATA_KEY = 'facesocial_user_data';

/**
 * ค่า headers ทั่วไปสำหรับการเรียกใช้ API
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

/**
 * รายการ endpoints หลักของ API
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGIN_FACE: '/auth/login-face',
    LOGOUT: '/auth/logout',
    CURRENT_USER: '/auth/me',
    UPDATE_PROFILE: '/auth/profile',
    STORE_FACE_DATA: '/auth/face-data',
    API_STATUS: '/auth/status'
  },
  
  // User endpoints
  USER: {
    GET_BY_ID: '/users',
    GET_FACES: '/users/{id}/faces',
    GET_POSTS: '/users/{id}/posts',
    GET_ACCESS_LOGS: '/users/{id}/access-logs',
    FOLLOW: '/users/{id}/follow',
    UNFOLLOW: '/users/{id}/follow'
  },
  
  // Post endpoints
  POST: {
    GET_ALL: '/posts',
    GET_BY_ID: '/posts/{id}',
    CREATE: '/posts',
    DELETE: '/posts/{id}',
    LIKE: '/posts/{id}/like',
    UNLIKE: '/posts/{id}/like',
    COMMENT: '/posts/{id}/comment',
    DELETE_COMMENT: '/posts/{id}/comment/{commentId}'
  },
  
  // Health check
  HEALTH: '/health'
};

/**
 * Helper function to replace URL parameters
 * Example: replaceParams('/users/{id}/posts', { id: '123' }) => '/users/123/posts'
 */
export const replaceParams = (url: string, params: Record<string, string>): string => {
  let result = url;
  Object.keys(params).forEach(key => {
    result = result.replace(`{${key}}`, params[key]);
  });
  return result;
};
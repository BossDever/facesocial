// frontend/src/app/config/api.config.ts

/**
 * Base URL สำหรับการเชื่อมต่อกับ Backend API
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Timeout สำหรับการเชื่อมต่อกับ API (ms)
 */
export const API_TIMEOUT = 30000; // 30 วินาที

/**
 * Headers เริ่มต้นสำหรับการส่งคำขอไปยัง API
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

/**
 * Key สำหรับเก็บ auth token ใน localStorage
 */
export const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Key สำหรับเก็บข้อมูลผู้ใช้ใน localStorage
 */
export const USER_DATA_KEY = 'user_data';

/**
 * เส้นทาง API ทั้งหมด
 */
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGIN_FACE: '/auth/login-face',
    LOGOUT: '/auth/logout',
    CURRENT_USER: '/auth/me',
    UPDATE_PROFILE: '/auth/profile',
    STORE_FACE_DATA: '/auth/face-data',
    API_STATUS: '/auth/status',
  },
  
  // User
  USER: {
    GET_BY_ID: '/users/:id',
    GET_FACES: '/users/:id/faces',
    GET_POSTS: '/users/:id/posts',
    GET_ACCESS_LOGS: '/users/:id/access-logs',
    FOLLOW: '/users/:id/follow',
    UNFOLLOW: '/users/:id/follow',
  },
  
  // Post
  POST: {
    GET_ALL: '/posts',
    GET_BY_ID: '/posts/:id',
    CREATE: '/posts',
    DELETE: '/posts/:id',
    LIKE: '/posts/:id/like',
    UNLIKE: '/posts/:id/like',
    COMMENT: '/posts/:id/comment',
    DELETE_COMMENT: '/posts/:id/comment/:commentId',
    GET_LIKE_COUNT: '/posts/:id/like-count',
    GET_COMMENTS: '/posts/:id/comments',
    CHECK_LIKED: '/posts/:id/liked',
  },
  
  // Upload
  UPLOAD: {
    FILES: '/uploads/files',
    PROFILE_IMAGE: '/uploads/profile-image',
    POST_MEDIA: '/uploads/post-media',
  }
};

/**
 * แทนที่พารามิเตอร์ใน URL
 * @param url URL ที่มีพารามิเตอร์ (เช่น /users/:id/posts)
 * @param params พารามิเตอร์ที่ต้องการแทนที่ (เช่น { id: '123' })
 * @returns URL ที่แทนที่พารามิเตอร์แล้ว (เช่น /users/123/posts)
 */
export const replaceParams = (url: string, params: Record<string, string>): string => {
  let result = url;
  Object.keys(params).forEach(key => {
    result = result.replace(`:${key}`, params[key]);
  });
  return result;
};
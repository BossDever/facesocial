// frontend/src/app/config/api.config.ts

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// API Timeout (milliseconds)
export const API_TIMEOUT = 30000;

// Default Headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Local Storage Keys
export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_DATA_KEY = 'user_data';

// API Endpoints
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: '/health',
  
  // Auth API
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
  
  // User API
  USER: {
    GET_BY_ID: '/users/:id',
    GET_FACES: '/users/:id/faces',
    GET_POSTS: '/users/:id/posts',
    GET_ACCESS_LOGS: '/users/:id/access-logs',
    FOLLOW: '/users/:id/follow',
    UNFOLLOW: '/users/:id/follow'
  },
  
  // Post API
  POST: {
    GET_ALL: '/posts',
    GET_BY_ID: '/posts/:id',
    CREATE: '/posts',
    DELETE: '/posts/:id',
    LIKE: '/posts/:id/like',
    UNLIKE: '/posts/:id/like',
    COMMENT: '/posts/:id/comment',
    DELETE_COMMENT: '/posts/:id/comment/:commentId',
    GET_COMMENTS: '/posts/:id/comments',
    GET_LIKE_COUNT: '/posts/:id/like-count',
    CHECK_LIKED: '/posts/:id/is-liked'
  },
  
  // Upload API
  UPLOAD: {
    FILES: '/uploads/files',
    PROFILE_IMAGE: '/uploads/profile-image',
    POST_MEDIA: '/uploads/post-media'
  }
};

/**
 * ฟังก์ชันแทนที่พารามิเตอร์ใน URL
 * เช่น replaceParams('/users/:id', { id: '123' }) จะได้ '/users/123'
 * 
 * @param url URL ที่มีพารามิเตอร์
 * @param params Object ของพารามิเตอร์ที่ต้องการแทนที่
 * @returns URL ที่แทนที่พารามิเตอร์แล้ว
 */
export const replaceParams = (url: string, params: Record<string, string>): string => {
  let result = url;
  Object.keys(params).forEach(key => {
    result = result.replace(`:${key}`, params[key]);
  });
  return result;
};
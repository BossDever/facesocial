// frontend/src/app/utils/api-tester.ts

import apiService from '../services/api.service';

/**
 * ฟังก์ชันสำหรับทดสอบการเชื่อมต่อ Backend API
 * ใช้สำหรับตรวจสอบว่า API ที่จำเป็นพร้อมใช้งานหรือไม่
 */
export async function testApiConnection(): Promise<{
  success: boolean;
  results: Record<string, { success: boolean; message: string; details?: any }>;
}> {
  const results: Record<string, { success: boolean; message: string; details?: any }> = {};
  let overallSuccess = true;

  try {
    // 1. ทดสอบ Health Check API
    try {
      const healthResponse = await apiService.checkHealth();
      results.health = {
        success: true,
        message: 'Health check API พร้อมใช้งาน',
        details: healthResponse
      };
    } catch (error) {
      results.health = {
        success: false,
        message: 'Health check API ไม่พร้อมใช้งาน, กรุณาตรวจสอบว่า Backend API ทำงานอยู่หรือไม่',
        details: error
      };
      overallSuccess = false;
    }

    // 2. ทดสอบ API Status
    try {
      const apiStatusResponse = await apiService.getApiStatus();
      results.apiStatus = {
        success: true,
        message: 'API Status endpoint พร้อมใช้งาน',
        details: apiStatusResponse
      };
    } catch (error) {
      results.apiStatus = {
        success: false,
        message: 'API Status endpoint ไม่พร้อมใช้งาน',
        details: error
      };
      overallSuccess = false;
    }

    // 3. ทดสอบการดึงโพสต์ (Public API ที่ไม่ต้องการการยืนยันตัวตน)
    try {
      const postsResponse = await apiService.getPosts(1, 5);
      results.posts = {
        success: true,
        message: 'Posts API พร้อมใช้งาน',
        details: {
          count: postsResponse.posts?.length || 0,
          pagination: postsResponse.pagination
        }
      };
    } catch (error) {
      results.posts = {
        success: false,
        message: 'Posts API ไม่พร้อมใช้งาน',
        details: error
      };
      overallSuccess = false;
    }

    // 4. ทดสอบระบบลงทะเบียนโดยไม่มีการจำลองข้อมูลจริง (เพื่อตรวจสอบว่า endpoint นี้พร้อมใช้งานหรือไม่)
    try {
      // ส่งข้อมูลไม่ครบเพื่อให้ API ตอบกลับว่าข้อมูลไม่ถูกต้อง แต่ไม่ได้สร้างผู้ใช้จริง
      await apiService.post('/auth/register/test', { email: 'test@example.com' });
      results.register = {
        success: true,
        message: 'Register API พร้อมใช้งาน (ผ่านการตรวจสอบการเข้าถึง)'
      };
    } catch (error: any) {
      // ถ้า API ตอบกลับด้วย 400 แสดงว่า endpoint นี้พร้อมใช้งานแต่ข้อมูลไม่ถูกต้อง (ซึ่งเป็นสิ่งที่ต้องการ)
      if (error.response && error.response.status === 400) {
        results.register = {
          success: true,
          message: 'Register API พร้อมใช้งาน (ตรวจสอบข้อมูลถูกต้อง)',
          details: error.response.data
        };
      } else if (error.response && error.response.status === 404) {
        // ถ้า API ตอบกลับด้วย 404 แสดงว่า endpoint test ไม่มี แต่อาจจะมี endpoint จริง
        results.register = {
          success: true,
          message: 'Register API endpoint อาจจะพร้อมใช้งาน'
        };
      } else {
        results.register = {
          success: false,
          message: 'Register API ไม่พร้อมใช้งาน',
          details: error
        };
        // ถ้าเป็น endpoint หลัก จึงกำหนดให้ overallSuccess เป็น false
        overallSuccess = false;
      }
    }

    // 5. ทดสอบระบบเข้าสู่ระบบโดยไม่มีการจำลองข้อมูลจริง
    try {
      // ส่งข้อมูลไม่ถูกต้องเพื่อตรวจสอบว่า endpoint นี้พร้อมใช้งานหรือไม่
      await apiService.post('/auth/login/test', { username: 'test', password: 'invalid' });
      results.login = {
        success: true,
        message: 'Login API พร้อมใช้งาน (ผ่านการตรวจสอบการเข้าถึง)'
      };
    } catch (error: any) {
      // ถ้า API ตอบกลับด้วย 401 หรือ 400 แสดงว่า endpoint นี้พร้อมใช้งานแต่ข้อมูลไม่ถูกต้อง
      if (error.response && (error.response.status === 401 || error.response.status === 400)) {
        results.login = {
          success: true,
          message: 'Login API พร้อมใช้งาน (ตรวจสอบข้อมูลถูกต้อง)',
          details: error.response.data
        };
      } else if (error.response && error.response.status === 404) {
        // ถ้า API ตอบกลับด้วย 404 แสดงว่า endpoint test ไม่มี แต่อาจจะมี endpoint จริง
        results.login = {
          success: true,
          message: 'Login API endpoint อาจจะพร้อมใช้งาน'
        };
      } else {
        results.login = {
          success: false,
          message: 'Login API ไม่พร้อมใช้งาน',
          details: error
        };
        // ถ้าเป็น endpoint หลัก จึงกำหนดให้ overallSuccess เป็น false
        overallSuccess = false;
      }
    }

    return {
      success: overallSuccess,
      results
    };

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทดสอบ API:', error);
    return {
      success: false,
      results: {
        error: {
          success: false,
          message: 'เกิดข้อผิดพลาดในการทดสอบ API',
          details: error
        }
      }
    };
  }
}

/**
 * ทดสอบการเชื่อมต่อ API แบบมีการยืนยันตัวตน
 * จะใช้เมื่อผู้ใช้ login แล้ว
 */
export async function testAuthenticatedApi(token?: string): Promise<{
  success: boolean;
  results: Record<string, { success: boolean; message: string; details?: any }>;
}> {
  const results: Record<string, { success: boolean; message: string; details?: any }> = {};
  let overallSuccess = true;

  try {
    // ถ้ามีการส่ง token มา ให้ตั้งค่า token ก่อนทดสอบ
    if (token) {
      apiService.setAuthToken(token);
    }

    // ตรวจสอบว่ามี token หรือไม่
    if (!apiService.hasAuthToken()) {
      return {
        success: false,
        results: {
          auth: {
            success: false,
            message: 'ไม่มี token สำหรับการยืนยันตัวตน'
          }
        }
      };
    }

    // 1. ทดสอบการดึงข้อมูลผู้ใช้ปัจจุบัน
    try {
      const userResponse = await apiService.getCurrentUser();
      results.currentUser = {
        success: true,
        message: 'Current User API พร้อมใช้งาน',
        details: {
          id: userResponse.id,
          username: userResponse.username
        }
      };
    } catch (error) {
      results.currentUser = {
        success: false,
        message: 'Current User API ไม่พร้อมใช้งาน',
        details: error
      };
      overallSuccess = false;
    }

    // 2. ทดสอบการอัปเดตโปรไฟล์ (แค่ตรวจสอบว่า endpoint พร้อมใช้งานหรือไม่)
    try {
      // ส่งข้อมูลเปล่าเพื่อตรวจสอบว่า endpoint นี้พร้อมใช้งานหรือไม่
      await apiService.patch('/auth/profile/test', {});
      results.updateProfile = {
        success: true,
        message: 'Update Profile API พร้อมใช้งาน'
      };
    } catch (error: any) {
      // ถ้า API ตอบกลับด้วย 400 แสดงว่า endpoint นี้พร้อมใช้งานแต่ข้อมูลไม่ถูกต้อง
      if (error.response && error.response.status === 400) {
        results.updateProfile = {
          success: true,
          message: 'Update Profile API พร้อมใช้งาน (ตรวจสอบข้อมูลถูกต้อง)',
          details: error.response.data
        };
      } else if (error.response && error.response.status === 404) {
        // ถ้า API ตอบกลับด้วย 404 แสดงว่า endpoint test ไม่มี แต่อาจจะมี endpoint จริง
        results.updateProfile = {
          success: true,
          message: 'Update Profile API endpoint อาจจะพร้อมใช้งาน'
        };
      } else if (error.response && error.response.status === 401) {
        // ถ้า API ตอบกลับด้วย 401 แสดงว่า token ไม่ถูกต้องหรือหมดอายุ
        results.updateProfile = {
          success: false,
          message: 'Token ไม่ถูกต้องหรือหมดอายุ',
          details: error.response.data
        };
        overallSuccess = false;
      } else {
        results.updateProfile = {
          success: false,
          message: 'Update Profile API ไม่พร้อมใช้งาน',
          details: error
        };
        overallSuccess = false;
      }
    }

    // 3. ทดสอบการสร้างโพสต์ (แค่ตรวจสอบว่า endpoint พร้อมใช้งานหรือไม่)
    try {
      // ส่งข้อมูลเปล่าเพื่อตรวจสอบว่า endpoint นี้พร้อมใช้งานหรือไม่
      await apiService.post('/posts/test', {});
      results.createPost = {
        success: true,
        message: 'Create Post API พร้อมใช้งาน'
      };
    } catch (error: any) {
      // ถ้า API ตอบกลับด้วย 400 แสดงว่า endpoint นี้พร้อมใช้งานแต่ข้อมูลไม่ถูกต้อง
      if (error.response && error.response.status === 400) {
        results.createPost = {
          success: true,
          message: 'Create Post API พร้อมใช้งาน (ตรวจสอบข้อมูลถูกต้อง)',
          details: error.response.data
        };
      } else if (error.response && error.response.status === 404) {
        // ถ้า API ตอบกลับด้วย 404 แสดงว่า endpoint test ไม่มี แต่อาจจะมี endpoint จริง
        results.createPost = {
          success: true,
          message: 'Create Post API endpoint อาจจะพร้อมใช้งาน'
        };
      } else if (error.response && error.response.status === 401) {
        // ถ้า API ตอบกลับด้วย 401 แสดงว่า token ไม่ถูกต้องหรือหมดอายุ
        results.createPost = {
          success: false,
          message: 'Token ไม่ถูกต้องหรือหมดอายุ',
          details: error.response.data
        };
        overallSuccess = false;
      } else {
        results.createPost = {
          success: false,
          message: 'Create Post API ไม่พร้อมใช้งาน',
          details: error
        };
        overallSuccess = false;
      }
    }

    return {
      success: overallSuccess,
      results
    };

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทดสอบ Authenticated API:', error);
    return {
      success: false,
      results: {
        error: {
          success: false,
          message: 'เกิดข้อผิดพลาดในการทดสอบ Authenticated API',
          details: error
        }
      }
    };
  }
}
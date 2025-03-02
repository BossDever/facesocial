// backend/src/index.js - เวอร์ชั่นแก้ไขแล้ว
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// โหลด environment variables จากไฟล์ .env
dotenv.config();

// ตั้งค่า JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// สร้าง Express app
const app = express();

// สร้าง Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// สร้างโฟลเดอร์สำหรับเก็บไฟล์อัปโหลด
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('สร้างโฟลเดอร์ uploads สำเร็จ');
}
app.use('/uploads', express.static(uploadsDir));

// Middleware ตรวจสอบการยืนยันตัวตน
const authenticate = async (req, res, next) => {
  try {
    // ดึง token จาก header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'ไม่ได้ยืนยันตัวตน' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // ตรวจสอบ token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ตรวจสอบว่า user ยังมีอยู่ในระบบหรือไม่
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    
    // เพิ่มข้อมูลผู้ใช้ลงใน request
    req.user = { id: user.id, username: user.username };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // ตรวจสอบว่า token หมดอายุหรือไม่
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        sessionExpired: true
      });
    }
    
    return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
  }
};

// === API ROUTES ===

// Health check route
app.get('/api/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  
  res.status(200).json({ 
    status: 'ok',
    message: 'FaceSocial API is running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');
    return true;
  } catch (error) {
    console.error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', error);
    return false;
  }
}

// === AUTH ROUTES ===

// ลงทะเบียนผู้ใช้ใหม่
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // ตรวจสอบว่า username หรือ email มีอยู่แล้วหรือไม่
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'ชื่อผู้ใช้หรืออีเมลนี้มีผู้ใช้งานแล้ว'
      });
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้างผู้ใช้ใหม่
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName
      }
    });

    // สร้าง token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ส่งข้อมูลผู้ใช้กลับไป (ไม่ส่ง password)
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      message: 'ลงทะเบียนสำเร็จ',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username } // รองรับการใช้อีเมลแทนชื่อผู้ใช้
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // สร้าง token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // บันทึกประวัติการเข้าสู่ระบบ
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        type: 'login',
        location: 'web',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    });

    // ส่งข้อมูลผู้ใช้กลับไป (ไม่ส่ง password)
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ดึงข้อมูลผู้ใช้ปัจจุบัน
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        createdAt: true,
        isActive: true,
        emailVerified: true,
        
        // รวมข้อมูลเพิ่มเติม
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            faceData: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// เพิ่ม API Status endpoint
app.get('/api/auth/status', async (req, res) => {
  try {
    // ตรวจสอบการเชื่อมต่อกับฐานข้อมูล
    const dbConnected = await checkDatabaseConnection();
    
    // สร้างข้อมูลสถานะ API จำลอง
    const apiStatus = [
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
        status: dbConnected ? 'active' : 'degraded', 
        responseTime: 180,
        successRate: 97.3,
        lastChecked: new Date()
      }
    ];
    
    return res.status(200).json(apiStatus);
  } catch (error) {
    console.error('Get API status error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะ API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ออกจากระบบ
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    if (req.user?.id) {
      await prisma.accessLog.create({
        data: {
          userId: req.user.id,
          type: 'logout',
          location: 'web',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });
    }

    return res.status(200).json({ message: 'ออกจากระบบสำเร็จ' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === USER ROUTES ===

// ดึงข้อมูลผู้ใช้ตาม ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        createdAt: true,
        
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === POST ROUTES ===

// ดึงโพสต์ทั้งหมด
app.get('/api/posts', async (req, res) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // สร้างข้อมูลโพสต์จำลอง
    const posts = [
      {
        id: '1',
        content: 'ยินดีต้อนรับสู่ FaceSocial!',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: '1',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          profileImage: null
        },
        media: [],
        _count: {
          likes: 5,
          comments: 2
        }
      },
      {
        id: '2',
        content: 'นี่คือโพสต์ตัวอย่างสำหรับการทดสอบ API',
        createdAt: new Date(Date.now() - 86400000), // เมื่อวาน
        updatedAt: new Date(Date.now() - 86400000),
        user: {
          id: '2',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          profileImage: null
        },
        media: [],
        _count: {
          likes: 2,
          comments: 1
        }
      }
    ];

    return res.status(200).json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: posts.length,
        totalPages: Math.ceil(posts.length / limitNum),
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงโพสต์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// สร้างโพสต์ใหม่
app.post('/api/posts', authenticate, async (req, res) => {
    try {
      const { content } = req.body;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
      }
  
      // สร้างโพสต์ใหม่
      const newPost = await prisma.post.create({
        data: {
          userId,
          content
        }
      });
  
      // ดึงข้อมูลโพสต์พร้อม user ที่สร้าง
      const post = await prisma.post.findUnique({
        where: { id: newPost.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          },
          media: true,
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });
  
      return res.status(201).json({
        message: 'สร้างโพสต์สำเร็จ',
        post
      });
    } catch (error) {
      console.error('Create post error:', error);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการสร้างโพสต์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ไลค์โพสต์
app.post('/api/posts/:id/like', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
      }
  
      // ตรวจสอบว่าโพสต์มีอยู่จริงหรือไม่
      const post = await prisma.post.findUnique({
        where: { id }
      });
  
      if (!post) {
        return res.status(404).json({ message: 'ไม่พบโพสต์' });
      }
  
      // ตรวจสอบว่าเคยกดไลค์แล้วหรือไม่
      const existingLike = await prisma.like.findFirst({
        where: {
          postId: id,
          userId
        }
      });
  
      if (existingLike) {
        return res.status(400).json({ message: 'คุณได้กดไลค์โพสต์นี้แล้ว' });
      }
  
      // สร้างไลค์
      await prisma.like.create({
        data: {
          postId: id,
          userId
        }
      });
  
      // ดึงจำนวนไลค์ปัจจุบัน
      const likeCount = await prisma.like.count({
        where: { postId: id }
      });
  
      return res.status(201).json({
        message: 'กดไลค์สำเร็จ',
        likeCount
      });
    } catch (error) {
      console.error('Like post error:', error);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการกดไลค์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // ยกเลิกการไลค์โพสต์
  app.delete('/api/posts/:id/like', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
      }
  
      // ตรวจสอบว่าโพสต์มีอยู่จริงหรือไม่
      const post = await prisma.post.findUnique({
        where: { id }
      });
  
      if (!post) {
        return res.status(404).json({ message: 'ไม่พบโพสต์' });
      }
  
      // ตรวจสอบว่าเคยกดไลค์แล้วหรือไม่
      const existingLike = await prisma.like.findFirst({
        where: {
          postId: id,
          userId
        }
      });
  
      if (!existingLike) {
        return res.status(400).json({ message: 'คุณยังไม่ได้กดไลค์โพสต์นี้' });
      }
  
      // ลบไลค์
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });
  
      // ดึงจำนวนไลค์ปัจจุบัน
      const likeCount = await prisma.like.count({
        where: { postId: id }
      });
  
      return res.status(200).json({
        message: 'ยกเลิกการกดไลค์สำเร็จ',
        likeCount
      });
    } catch (error) {
      console.error('Unlike post error:', error);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการยกเลิกการกดไลค์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // แสดงความคิดเห็นบนโพสต์
app.post('/api/posts/:id/comment', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
      }
  
      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'กรุณากรอกข้อความ' });
      }
  
      // ตรวจสอบว่าโพสต์มีอยู่จริงหรือไม่
      const post = await prisma.post.findUnique({
        where: { id }
      });
  
      if (!post) {
        return res.status(404).json({ message: 'ไม่พบโพสต์' });
      }
  
      // สร้างความคิดเห็น
      const comment = await prisma.comment.create({
        data: {
          postId: id,
          userId,
          content
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        }
      });
  
      return res.status(201).json({
        message: 'แสดงความคิดเห็นสำเร็จ',
        comment
      });
    } catch (error) {
      console.error('Comment post error:', error);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการแสดงความคิดเห็น',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // ลบความคิดเห็น
  app.delete('/api/posts/:id/comment/:commentId', authenticate, async (req, res) => {
    try {
      const { id, commentId } = req.params;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาต' });
      }
  
      // ตรวจสอบว่าความคิดเห็นมีอยู่จริงหรือไม่
      const comment = await prisma.comment.findUnique({
        where: { id: commentId }
      });
  
      if (!comment) {
        return res.status(404).json({ message: 'ไม่พบความคิดเห็น' });
      }
  
      // ตรวจสอบว่าความคิดเห็นนี้เป็นของโพสต์นี้จริงหรือไม่
      if (comment.postId !== id) {
        return res.status(400).json({ message: 'ความคิดเห็นนี้ไม่ได้อยู่ในโพสต์นี้' });
      }
  
      // ตรวจสอบว่าเป็นเจ้าของความคิดเห็นหรือเจ้าของโพสต์หรือไม่
      if (comment.userId !== userId) {
        const post = await prisma.post.findUnique({
          where: { id }
        });
  
        if (post.userId !== userId) {
          return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบความคิดเห็นนี้' });
        }
      }
  
      // ลบความคิดเห็น
      await prisma.comment.delete({
        where: { id: commentId }
      });
  
      return res.status(200).json({
        message: 'ลบความคิดเห็นสำเร็จ'
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการลบความคิดเห็น',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
// จัดการ route ที่ไม่มี
app.use((req, res) => {
  res.status(404).json({
    message: 'API endpoint ไม่พบ',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  checkDatabaseConnection();
  console.log(`API health check: http://localhost:${PORT}/api/health`);
});

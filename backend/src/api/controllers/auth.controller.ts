import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// ฟังก์ชันลงทะเบียนผู้ใช้
export const register = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน
export const login = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันเข้าสู่ระบบด้วยใบหน้า
export const loginWithFace = async (req: Request, res: Response) => {
  try {
    const { embeddings } = req.body;

    if (!embeddings || !Array.isArray(embeddings)) {
      return res.status(400).json({ message: 'ข้อมูล embeddings ไม่ถูกต้อง' });
    }

    // ดึงข้อมูล face embeddings ทั้งหมดจากฐานข้อมูล
    const allFaceData = await prisma.faceData.findMany({
      include: {
        user: true
      }
    });

    // ค่า threshold สำหรับการเปรียบเทียบใบหน้า (ค่าน้อย = เข้มงวด, ค่ามาก = ผ่อนปรน)
    const FACE_SIMILARITY_THRESHOLD = 0.6;
    
    // ฟังก์ชันคำนวณระยะห่างระหว่าง embeddings
    const calculateDistance = (emb1: number[], emb2: number[]): number => {
      if (emb1.length !== emb2.length) {
        console.warn(`Embeddings มีขนาดไม่เท่ากัน: ${emb1.length} vs ${emb2.length}`);
        
        // ใช้ความยาวที่น้อยกว่าในการเปรียบเทียบ
        const minLength = Math.min(emb1.length, emb2.length);
        
        let sum = 0;
        for (let i = 0; i < minLength; i++) {
          const diff = emb1[i] - emb2[i];
          sum += diff * diff;
        }
        
        return Math.sqrt(sum);
      }
      
      // กรณีที่ขนาดเท่ากัน ใช้โค้ดเดิม
      let sum = 0;
      for (let i = 0; i < emb1.length; i++) {
        const diff = emb1[i] - emb2[i];
        sum += diff * diff;
      }
      
      return Math.sqrt(sum);
    };

    // ค้นหาใบหน้าที่ตรงกัน
    let matchedUser = null;
    let bestMatch = { userId: '', distance: Number.MAX_VALUE };

    for (const faceData of allFaceData) {
      try {
        const distance = calculateDistance(embeddings, faceData.embeddings);
        
        // ตรวจสอบว่าระยะห่างน้อยกว่า threshold และน้อยกว่าค่าที่ดีที่สุดที่เคยเจอมา
        if (distance < FACE_SIMILARITY_THRESHOLD && distance < bestMatch.distance) {
          bestMatch = { userId: faceData.userId, distance };
          matchedUser = faceData.user;
        }
      } catch (err) {
        console.warn('Error comparing face embeddings:', err);
        continue;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ message: 'ไม่พบใบหน้าที่ตรงกับในระบบ' });
    }

    // สร้าง token
    const token = jwt.sign(
      { id: matchedUser.id, username: matchedUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // บันทึกประวัติการเข้าสู่ระบบ
    await prisma.accessLog.create({
      data: {
        userId: matchedUser.id,
        type: 'face_login',
        location: 'web',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    });

    // ส่งข้อมูลผู้ใช้กลับไป (ไม่ส่ง password)
    const { password: _, ...userWithoutPassword } = matchedUser;

    return res.status(200).json({
      message: 'เข้าสู่ระบบด้วยใบหน้าสำเร็จ',
      user: userWithoutPassword,
      token,
      confidence: 1 - bestMatch.distance
    });
  } catch (error: any) {
    console.error('Face login error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วยใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันออกจากระบบ
export const logout = async (req: Request, res: Response) => {
  try {
    // ในกรณีที่ต้องการเก็บ token ที่ถูก blacklist
    // ตัวอย่างโค้ดสำหรับการเพิ่ม token เข้า blacklist
    // await prisma.tokenBlacklist.create({
    //   data: {
    //     token: req.headers.authorization?.split(' ')[1] || '',
    //     expiresAt: new Date(/* คำนวณเวลาหมดอายุ */)
    //   }
    // });

    // บันทึกประวัติการออกจากระบบ (ถ้ามี user id จาก middleware)
    if ((req as any).user?.id) {
      await prisma.accessLog.create({
        data: {
          userId: (req as any).user.id,
          type: 'logout',
          location: 'web',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });
    }

    return res.status(200).json({ message: 'ออกจากระบบสำเร็จ' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันบันทึกข้อมูลใบหน้า
export const storeFaceData = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { embeddings, imageBase64, score } = req.body;

    if (!embeddings || !Array.isArray(embeddings)) {
      return res.status(400).json({ message: 'ข้อมูล embeddings ไม่ถูกต้อง' });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    // บันทึกข้อมูลใบหน้า
    const faceData = await prisma.faceData.create({
      data: {
        userId,
        embeddings,
        imageUrl: imageBase64.substring(0, 100) // เก็บเฉพาะบางส่วนของรูปภาพหรือ URL ที่เก็บรูปภาพ
      }
    });

    return res.status(201).json({
      message: 'บันทึกข้อมูลใบหน้าสำเร็จ',
      faceData: {
        id: faceData.id,
        userId: faceData.userId,
        createdAt: faceData.createdAt
      }
    });
  } catch (error: any) {
    console.error('Store face data error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงข้อมูลผู้ใช้ปัจจุบัน
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // req.user ถูกตั้งค่าโดย auth middleware
    const userId = (req as any).user?.id;
    
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
        bio: true, // เพิ่มฟิลด์ bio
        isAdmin: true, // เพิ่มฟิลด์ isAdmin
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
  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันอัปเดตข้อมูลผู้ใช้
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
    }

    const { firstName, lastName, profileImage, bio } = req.body;

    // อัปเดตข้อมูลผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        profileImage,
        bio,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      message: 'อัปเดตข้อมูลโปรไฟล์สำเร็จ',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update user profile error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลโปรไฟล์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// เพิ่มฟังก์ชันใหม่: ตรวจสอบอีเมลซ้ำ
export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        message: 'กรุณาระบุอีเมลที่ต้องการตรวจสอบ'
      });
    }

    // ตรวจสอบว่าอีเมลมีอยู่แล้วหรือไม่
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive' // ไม่สนใจตัวพิมพ์ใหญ่-เล็ก
        }
      }
    });

    return res.status(200).json({
      available: !existingUser,
      message: existingUser ? 'อีเมลนี้มีผู้ใช้งานแล้ว' : 'อีเมลนี้สามารถใช้งานได้'
    });
  } catch (error: any) {
    console.error('Check email error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงข้อมูลสถานะ API ทั้งหมด
export const getApiStatus = async (req: Request, res: Response) => {
  try {
    // ดึงข้อมูลสถานะ API จากฐานข้อมูล
    const apiStatus = await prisma.apiStatus.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลตัวอย่าง
    if (apiStatus.length === 0) {
      await prisma.apiStatus.createMany({
        data: [
          { 
            name: 'Authentication API', 
            endpoint: '/api/auth', 
            status: 'active', 
            responseTime: 120,
            successRate: 99.8,
          },
          { 
            name: 'User API', 
            endpoint: '/api/users', 
            status: 'active', 
            responseTime: 150,
            successRate: 99.5,
          },
          { 
            name: 'Post API', 
            endpoint: '/api/posts', 
            status: 'degraded', 
            responseTime: 320,
            successRate: 95.2,
          },
          { 
            name: 'Face Recognition API', 
            endpoint: '/api/face', 
            status: 'active', 
            responseTime: 180,
            successRate: 98.7,
          }
        ]
      });

      // ดึงข้อมูลอีกครั้งหลังจากสร้าง
      const newApiStatus = await prisma.apiStatus.findMany({
        orderBy: {
          name: 'asc'
        }
      });
      
      return res.status(200).json(newApiStatus);
    }

    return res.status(200).json(apiStatus);
  } catch (error: any) {
    console.error('Get API status error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะ API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// เพิ่มฟังก์ชันใหม่: ตรวจสอบชื่อผู้ใช้ซ้ำ
export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        message: 'กรุณาระบุชื่อผู้ใช้ที่ต้องการตรวจสอบ'
      });
    }

    // ตรวจสอบว่าชื่อผู้ใช้มีอยู่แล้วหรือไม่
    const existingUser = await prisma.user.findFirst({
      where: { 
        username: {
          equals: username,
          mode: 'insensitive' // ไม่สนใจตัวพิมพ์ใหญ่-เล็ก
        }
      }
    });

    return res.status(200).json({
      available: !existingUser,
      message: existingUser ? 'ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว' : 'ชื่อผู้ใช้นี้สามารถใช้งานได้'
    });
  } catch (error: any) {
    console.error('Check username error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ฟังก์ชันดึงข้อมูลผู้ใช้ตาม ID
export const getUserById = async (req: Request, res: Response) => {
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
        bio: true,
        createdAt: true,
        
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
    console.error('Get user by ID error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงข้อมูลใบหน้าของผู้ใช้
export const getUserFaces = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.id;
    
    // ตรวจสอบว่าเป็นการดูข้อมูลของตัวเองหรือไม่
    // ถ้าไม่ใช่ให้ส่งเฉพาะข้อมูลบางส่วน
    const isOwnProfile = currentUserId === id;

    // ดึงข้อมูลใบหน้า
    const faceData = await prisma.faceData.findMany({
      where: { userId: id },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        imageUrl: true,
        // ส่ง embeddings เฉพาะกรณีที่เป็นเจ้าของโปรไฟล์
        embeddings: isOwnProfile
      }
    });

    return res.status(200).json(faceData);
  } catch (error: any) {
    console.error('Get user faces error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงโพสต์ของผู้ใช้
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // ดึงจำนวนโพสต์ทั้งหมด
    const total = await prisma.post.count({
      where: { userId: id }
    });

    // ดึงโพสต์ตามเงื่อนไข
    const posts = await prisma.post.findMany({
      where: { userId: id },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum,
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

    // สร้างข้อมูล pagination
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    return res.status(200).json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    });
  } catch (error: any) {
    console.error('Get user posts error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงโพสต์ของผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงประวัติการเข้าถึงของผู้ใช้
export const getUserAccessLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.id;
    
    // ตรวจสอบว่าเป็นการดูข้อมูลของตัวเองหรือไม่
    if (currentUserId !== id) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
    }

    // ดึงประวัติการเข้าถึง
    const accessLogs = await prisma.accessLog.findMany({
      where: { userId: id },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // จำกัดจำนวนรายการ
    });

    return res.status(200).json(accessLogs);
  } catch (error: any) {
    console.error('Get user access logs error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการเข้าถึง',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันติดตามผู้ใช้
export const followUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID ของผู้ใช้ที่ต้องการติดตาม
    const followerId = (req as any).user?.id; // ID ของผู้ติดตาม
    
    if (!followerId) {
      return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
    }
    
    if (followerId === id) {
      return res.status(400).json({ message: 'ไม่สามารถติดตามตัวเองได้' });
    }

    // ตรวจสอบว่าติดตามอยู่แล้วหรือไม่
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id
        }
      }
    });
    
    if (existingFollow) {
      return res.status(400).json({ message: 'คุณติดตามผู้ใช้นี้อยู่แล้ว' });
    }

    // สร้างการติดตาม
    await prisma.follow.create({
      data: {
        followerId,
        followingId: id
      }
    });

    return res.status(200).json({ message: 'ติดตามสำเร็จ' });
  } catch (error: any) {
    console.error('Follow user error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการติดตามผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันเลิกติดตามผู้ใช้
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID ของผู้ใช้ที่ต้องการเลิกติดตาม
    const followerId = (req as any).user?.id; // ID ของผู้ติดตาม
    
    if (!followerId) {
      return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
    }

    // ตรวจสอบว่าติดตามอยู่หรือไม่
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id
        }
      }
    });
    
    if (!existingFollow) {
      return res.status(400).json({ message: 'คุณไม่ได้ติดตามผู้ใช้นี้' });
    }

    // ลบการติดตาม
    await prisma.follow.delete({
      where: {
        id: existingFollow.id
      }
    });

    return res.status(200).json({ message: 'เลิกติดตามสำเร็จ' });
  } catch (error: any) {
    console.error('Unfollow user error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการเลิกติดตามผู้ใช้',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// backend/src/api/controllers/post.controller.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// ฟังก์ชันสร้างโพสต์ใหม่
export const createPost = async (req: Request, res: Response) => {
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

    // ถ้ามีไฟล์ media แนบมาด้วย
    if (req.body.media && Array.isArray(req.body.media)) {
      // ตรวจสอบว่ามีโฟลเดอร์สำหรับเก็บไฟล์หรือไม่
      const uploadDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // วนลูปเพื่อสร้าง media สำหรับแต่ละไฟล์
      for (const mediaItem of req.body.media) {
        const { type, dataUrl } = mediaItem;
        
        // แปลง Data URL เป็นไฟล์
        if (dataUrl && dataUrl.includes('base64')) {
          // แยกส่วน metadata และ base64 data
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // สร้างชื่อไฟล์
            const filename = `${Date.now()}-${Math.round(Math.random() * 1000)}.${type === 'image' ? 'jpg' : 'mp4'}`;
            const filepath = path.join(uploadDir, filename);
            
            // บันทึกไฟล์
            fs.writeFileSync(filepath, buffer);
            
            // สร้างข้อมูล media ในฐานข้อมูล
            await prisma.media.create({
              data: {
                postId: newPost.id,
                type,
                url: `/uploads/${filename}`
              }
            });
          }
        }
      }
    }

    // ดึงข้อมูลโพสต์พร้อม media
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
  } catch (error: any) {
    console.error('Create post error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการสร้างโพสต์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงโพสต์ทั้งหมด
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // ดึงจำนวนโพสต์ทั้งหมด
    const total = await prisma.post.count();

    // ดึงโพสต์ตามเงื่อนไข
    const posts = await prisma.post.findMany({
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
    console.error('Get all posts error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงโพสต์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันดึงโพสต์ตาม ID
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
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
        comments: {
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
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'ไม่พบโพสต์' });
    }

    return res.status(200).json(post);
  } catch (error: any) {
    console.error('Get post error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงโพสต์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันลบโพสต์
export const deletePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
  
      // ตรวจสอบว่าโพสต์มีอยู่จริงหรือไม่
      const post = await prisma.post.findUnique({
        where: { id },
        include: { media: true }
      });
  
      if (!post) {
        return res.status(404).json({ message: 'ไม่พบโพสต์' });
      }
  
      // ตรวจสอบว่าเป็นเจ้าของโพสต์หรือไม่
      if (post.userId !== userId) {
        // ถ้าไม่ใช่เจ้าของ ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { isAdmin: true }
        });
  
        if (!user?.isAdmin) {
          return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบโพสต์นี้' });
        }
      }
  
      // ลบไฟล์ media
      for (const media of post.media) {
        const filePath = path.join(__dirname, '../../../', media.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
  
      // ลบโพสต์และข้อมูลที่เกี่ยวข้อง
      await prisma.$transaction([
        // ลบ comments
        prisma.comment.deleteMany({
          where: { postId: id }
        }),
        // ลบ likes
        prisma.like.deleteMany({
          where: { postId: id }
        }),
        // ลบ faceTags ที่เกี่ยวข้องกับ media ของโพสต์
        prisma.faceTag.deleteMany({
          where: {
            media: {
              postId: id
            }
          }
        }),
        // ลบ media
        prisma.media.deleteMany({
          where: { postId: id }
        }),
        // ลบโพสต์
        prisma.post.delete({
          where: { id }
        })
      ]);
  
      return res.status(200).json({
        message: 'ลบโพสต์สำเร็จ'
      });
    } catch (error: any) {
      console.error('Delete post error:', error);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการลบโพสต์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

// ฟังก์ชันกดไลค์โพสต์
export const likePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // ตรวจสอบว่าโพสต์มีอยู่จริงหรือไม่
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'ไม่พบโพสต์' });
    }

    // ตรวจสอบว่าเคยกดไลค์แล้วหรือไม่
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId
        }
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
  } catch (error: any) {
    console.error('Like post error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการกดไลค์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันยกเลิกการกดไลค์โพสต์
export const unlikePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // ตรวจสอบว่าโพสต์มีอยู่จริงหรือไม่
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'ไม่พบโพสต์' });
    }

    // ตรวจสอบว่าเคยกดไลค์แล้วหรือไม่
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId
        }
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
  } catch (error: any) {
    console.error('Unlike post error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการยกเลิกการกดไลค์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันแสดงความคิดเห็น
export const commentPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

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
  } catch (error: any) {
    console.error('Comment post error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการแสดงความคิดเห็น',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ฟังก์ชันลบความคิดเห็น
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user?.id;

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

    // ตรวจสอบว่าเป็นเจ้าของความคิดเห็นหรือไม่
    if (comment.userId !== userId) {
      // ถ้าไม่ใช่เจ้าของ ตรวจสอบว่าเป็นผู้ดูแลระบบหรือเจ้าของโพสต์หรือไม่
      const post = await prisma.post.findUnique({
        where: { id }
      });

      if (!post) {
        return res.status(404).json({ message: 'ไม่พบโพสต์' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
      });

      if (post.userId !== userId && !user?.isAdmin) {
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
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการลบความคิดเห็น',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
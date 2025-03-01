const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('เริ่มการตรวจสอบฐานข้อมูล...');

    // ตรวจสอบจำนวนผู้ใช้
    const userCount = await prisma.user.count();
    console.log(`จำนวนผู้ใช้ทั้งหมด: ${userCount}`);

    // ดึงข้อมูลผู้ใช้ล่าสุด (5 คน)
    const latestUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            faceData: true
          }
        }
      }
    });
    
    console.log('ผู้ใช้ล่าสุด:');
    latestUsers.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  สมัครเมื่อ: ${user.createdAt}`);
      console.log(`  จำนวนข้อมูลใบหน้า: ${user._count.faceData}`);
      console.log('---');
    });

    // ตรวจสอบจำนวนข้อมูลใบหน้า
    const faceDataCount = await prisma.faceData.count();
    console.log(`จำนวนข้อมูลใบหน้าทั้งหมด: ${faceDataCount}`);

    // ตรวจสอบสถานะ API
    const apiStatusCount = await prisma.apiStatus.count();
    console.log(`จำนวนรายการสถานะ API: ${apiStatusCount}`);

    console.log('การตรวจสอบฐานข้อมูลเสร็จสิ้น');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบฐานข้อมูล:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// เรียกใช้ฟังก์ชันตรวจสอบ
checkDatabase();
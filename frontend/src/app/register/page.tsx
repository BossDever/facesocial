'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import FileUploader from '../components/register/FileUploader';
import ThemeToggle from '../components/theme/ThemeToggle';
import TensorflowSetup from './tensorflow-setup';
import apiService from '../services/api.service';
import faceNetService from '../services/facenet.service';

interface FaceImage {
  src: string;
  score: number;
  embeddings?: number[]; // เพิ่ม embeddings สำหรับเก็บค่าจากโมเดล FaceNet
}

// กำหนดจำนวนรูปใบหน้าขั้นต่ำที่ต้องการ
const MIN_FACE_IMAGES = 10;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // ข้อมูลผู้ใช้สำหรับขั้นตอนที่ 1
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  
  // ข้อมูลใบหน้าสำหรับขั้นตอนที่ 2
  const [faceImages, setFaceImages] = useState<FaceImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // สถานะการโหลดโมเดล
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  
  // รูปภาพที่เลือกสำหรับดูแบบขยาย
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // สถานะการตรวจสอบชื่อผู้ใช้
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  
  // โหลดข้อมูลจาก localStorage เมื่อโหลดหน้า
  useEffect(() => {
    try {
      // โหลดข้อมูลผู้ใช้
      const storedUserData = localStorage.getItem('registrationUserData');
      if (storedUserData) {
        try {
          setUserData(JSON.parse(storedUserData));
        } catch (error) {
          console.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้:', error);
        }
      }
      
      // โหลดข้อมูลใบหน้าเดิม
      loadFaceImages();
      
      // ตรวจสอบว่าควรแสดงขั้นตอนใด
      const storedStep = localStorage.getItem('registrationStep');
      if (storedStep) {
        setStep(parseInt(storedStep));
      }
      
      // โหลดโมเดล FaceNet แบบล่วงหน้า
      preloadFaceNetModel();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
    }
  }, []);
  
  // โหลดโมเดล FaceNet แบบล่วงหน้า
  const preloadFaceNetModel = async () => {
    try {
      setIsModelLoading(true);
      const result = await faceNetService.loadModel();
      if (result) {
        console.log('โหลดโมเดล FaceNet ล่วงหน้าสำเร็จ');
      } else {
        console.warn('โหลดโมเดล FaceNet ล่วงหน้าไม่สำเร็จ จะลองใหม่เมื่อจำเป็น');
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดโมเดล FaceNet:', error);
      setModelError('ไม่สามารถโหลดโมเดล FaceNet ได้ อาจใช้คุณสมบัติบางอย่างไม่ได้');
    } finally {
      setIsModelLoading(false);
    }
  };
  
  // ฟังก์ชันสำหรับโหลดข้อมูลใบหน้าจาก localStorage
  const loadFaceImages = useCallback(() => {
    try {
      // โหลดข้อมูลใบหน้าเดิมจาก localStorage
      let existingFaceImages: FaceImage[] = [];
      const storedFaceImages = localStorage.getItem('registrationFaceImages');
      
      if (storedFaceImages) {
        existingFaceImages = JSON.parse(storedFaceImages);
        console.log('โหลดข้อมูลใบหน้าเดิม:', existingFaceImages.length, 'รูป');
      }
      
      // โหลดรูปภาพที่ถ่ายมาจากหน้า capture
      const newCapturedImages = localStorage.getItem('faceImages');
      if (newCapturedImages) {
        try {
          const images = JSON.parse(newCapturedImages);
          console.log('พบรูปภาพใหม่จากการถ่าย:', images.length, 'รูป');
          
          // สร้าง score สำหรับภาพที่ได้รับ
          const imagesWithScores = images.map((src: string) => ({ src, score: 80 }));
          
          // รวมรูปภาพใหม่เข้ากับรูปภาพเดิม
          const combinedImages = [...existingFaceImages, ...imagesWithScores];
          
          // อัปเดต state และ localStorage
          console.log('รวมรูปภาพทั้งหมด:', combinedImages.length, 'รูป');
          setFaceImages(combinedImages);
          localStorage.setItem('registrationFaceImages', JSON.stringify(combinedImages));
          
          // ล้าง localStorage หลังจากโหลดเสร็จ
          localStorage.removeItem('faceImages');
          
          // สร้าง embeddings สำหรับรูปภาพใหม่ (ทำในพื้นหลัง)
          processNewFaceImages(imagesWithScores);
        } catch (error) {
          console.error('ไม่สามารถโหลดรูปภาพใหม่ได้:', error);
        }
      } else {
        // ถ้าไม่มีรูปภาพใหม่ ให้ใช้รูปภาพเดิมที่มีอยู่
        setFaceImages(existingFaceImages);
        
        // ตรวจสอบว่ามีรูปภาพที่ยังไม่มี embeddings หรือไม่
        const imagesWithoutEmbeddings = existingFaceImages.filter(img => !img.embeddings);
        if (imagesWithoutEmbeddings.length > 0) {
          console.log('พบรูปภาพที่ยังไม่มี embeddings:', imagesWithoutEmbeddings.length, 'รูป');
          processNewFaceImages(imagesWithoutEmbeddings);
        }
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลรูปภาพ:', error);
    }
  }, []);
  
  // ประมวลผลรูปภาพใหม่ สร้าง embeddings
  const processNewFaceImages = async (newImages: FaceImage[]) => {
    // ถ้าไม่มีรูปภาพใหม่ ไม่ต้องประมวลผล
    if (newImages.length === 0) return;
    
    console.log('กำลังประมวลผลรูปภาพใหม่เพื่อสร้าง embeddings:', newImages.length, 'รูป');
    
    try {
      // ตรวจสอบและโหลดโมเดล FaceNet
      await faceNetService.loadModel();
      
      // ประมวลผลทีละรูป
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        try {
          // สร้าง embeddings สำหรับรูปภาพ
          const embeddings = await faceNetService.generateEmbeddings(img.src);
          
          // อัปเดต embeddings ในรูปภาพ
          setFaceImages(prevImages => {
            // หาตำแหน่งของรูปภาพใน state
            const index = prevImages.findIndex(prevImg => prevImg.src === img.src);
            if (index === -1) return prevImages;
            
            // สร้างอาร์เรย์ใหม่โดยคัดลอกค่าจากอาร์เรย์เดิม
            const newImages = [...prevImages];
            
            // อัปเดต embeddings ที่ตำแหน่งที่พบ
            newImages[index] = { ...newImages[index], embeddings };
            
            // บันทึกลง localStorage
            localStorage.setItem('registrationFaceImages', JSON.stringify(newImages));
            
            return newImages;
          });
          
          console.log(`สร้าง embeddings สำหรับรูปภาพที่ ${i + 1}/${newImages.length} สำเร็จ`);
        } catch (error) {
          console.error(`เกิดข้อผิดพลาดในการสร้าง embeddings สำหรับรูปภาพที่ ${i + 1}:`, error);
        }
        
        // หน่วงเวลาเล็กน้อยระหว่างรูปเพื่อไม่ให้เบราว์เซอร์ค้าง
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('ประมวลผลรูปภาพใหม่เสร็จสิ้น');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการประมวลผลรูปภาพใหม่:', error);
    }
  };
  
  // ดึงข้อมูลสำหรับการลงทะเบียนเมื่อเริ่มต้น
  useEffect(() => {
    // แสดงจำนวนรูปภาพที่มีอยู่ใน console เพื่อดูว่ามีการโหลดข้อมูลถูกต้องหรือไม่
    console.log('จำนวนรูปภาพในหน้ารีจิสเตอร์:', faceImages.length);
  }, [faceImages]);
  
  // คำนวณว่ามีรูปภาพเพียงพอสำหรับการลงทะเบียนหรือไม่
  const hasEnoughImages = faceImages.length >= MIN_FACE_IMAGES;
  
  // คำนวณจำนวนรูปที่ต้องการเพิ่ม
  const imagesNeeded = Math.max(0, MIN_FACE_IMAGES - faceImages.length);
  
  // จัดการการเปลี่ยนแปลงใน input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedUserData = { ...userData, [name]: value };
    setUserData(updatedUserData);
    
    // บันทึกข้อมูลลง localStorage ทุกครั้งที่มีการเปลี่ยนแปลง
    localStorage.setItem('registrationUserData', JSON.stringify(updatedUserData));
    
    // ลบข้อผิดพลาดเมื่อผู้ใช้แก้ไข
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // ตรวจสอบชื่อผู้ใช้เมื่อมีการเปลี่ยนแปลง (debounced)
    if (name === 'username' && value.trim().length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  };
  
  // ตรวจสอบว่าชื่อผู้ใช้มีอยู่ในระบบหรือไม่
  const checkUsernameAvailability = async (username: string) => {
    // ถ้าชื่อผู้ใช้สั้นเกินไป ไม่ต้องตรวจสอบ
    if (!username || username.trim().length < 3) return;
    
    try {
      setIsCheckingUsername(true);
      
      // เรียกใช้ API เพื่อตรวจสอบชื่อผู้ใช้
      const response = await apiService.get('/api/auth/check-username', {
        params: { username: username.trim() }
      }).catch(err => {
        // กรณี API ไม่พร้อมใช้งาน ให้ทำการจำลองการตรวจสอบ
        console.warn('ไม่สามารถตรวจสอบชื่อผู้ใช้ผ่าน API ได้:', err);
        
        // สำหรับการทดสอบ สมมติว่าชื่อผู้ใช้ที่ขึ้นต้นด้วย "test" มีอยู่แล้ว
        return { available: !username.toLowerCase().startsWith('test') };
      });
      
      // ตรวจสอบผลลัพธ์
      if (response && !response.available) {
        setErrors(prev => ({
          ...prev,
          username: 'ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
        }));
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้:', error);
    } finally {
      setIsCheckingUsername(false);
    }
  };
  
  // ตรวจสอบข้อมูลในขั้นตอนที่ 1
  const validateStep1 = async () => {
    const newErrors: Record<string, string> = {};
    
    // ตรวจสอบชื่อผู้ใช้
    if (!userData.username) {
      newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
    } else if (userData.username.length < 3) {
      newErrors.username = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
    }
    
    // ตรวจสอบอีเมล
    if (!userData.email) {
      newErrors.email = 'กรุณากรอกอีเมล';
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    // ตรวจสอบรหัสผ่าน
    if (!userData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน';
    } else if (userData.password.length < 8) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    }
    
    // ตรวจสอบการยืนยันรหัสผ่าน
    if (userData.password !== userData.confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }
    
    // ตั้งค่าข้อผิดพลาด
    setErrors(newErrors);
    
    // ถ้ามีข้อผิดพลาด ไม่ต้องทำต่อ
    if (Object.keys(newErrors).length > 0) {
      return false;
    }
    
    // ตรวจสอบชื่อผู้ใช้ผ่าน API
    setIsCheckingUsername(true);
    
    try {
      // เรียกใช้ API เพื่อตรวจสอบชื่อผู้ใช้
      const response = await apiService.get('/api/auth/check-username', {
        params: { username: userData.username.trim() }
      }).catch(err => {
        // กรณี API ไม่พร้อมใช้งาน แต่เราจะสมมติว่าตรวจสอบผ่าน
        console.warn('ไม่สามารถตรวจสอบชื่อผู้ใช้ผ่าน API ได้:', err);
        return { available: true };
      });
      
      // ตรวจสอบผลลัพธ์
      if (response && !response.available) {
        setErrors(prev => ({
          ...prev,
          username: 'ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
        }));
        setIsCheckingUsername(false);
        return false;
      }
      
      // ตรวจสอบผ่าน
      setIsCheckingUsername(false);
      return true;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้:', error);
      setIsCheckingUsername(false);
      
      // กรณีมีข้อผิดพลาด แต่ให้ผ่านไปก่อน (ระบบจะตรวจสอบอีกครั้งตอนลงทะเบียน)
      return true;
    }
  };
  
  // ไปขั้นตอนถัดไป
  const handleNextStep = async () => {
    // ตรวจสอบข้อมูลก่อนไปขั้นตอนถัดไป
    const isValid = await validateStep1();
    
    if (isValid) {
      setStep(2);
      localStorage.setItem('registrationStep', '2');
    }
  };
  
  // กลับไปขั้นตอนก่อนหน้า
  const handlePrevStep = () => {
    setStep(1);
    localStorage.setItem('registrationStep', '1');
  };
  
  // จัดการการอัปโหลดรูปภาพ
  const handleImageUploaded = useCallback(async (imageSrc: string, score: number) => {
    console.log('เรียกใช้ handleImageUploaded');
    
    try {
      // สร้าง embeddings จากรูปภาพใหม่
      let embeddings: number[] | undefined;
      
      try {
        // พยายามสร้าง embeddings (ถ้าโมเดลพร้อมใช้งาน)
        embeddings = await faceNetService.generateEmbeddings(imageSrc);
        console.log('สร้าง embeddings สำเร็จ:', embeddings?.length, 'มิติ');
      } catch (error) {
        console.warn('ไม่สามารถสร้าง embeddings ได้:', error);
        // ถ้าไม่สามารถสร้าง embeddings ได้ ให้เก็บรูปไว้ก่อน จะมาสร้างภายหลัง
        embeddings = undefined;
      }
      
      // สร้างอาร์เรย์ใหม่โดยคัดลอกค่าจาก faceImages เดิมก่อน แล้วค่อยเพิ่มรูปใหม่
      setFaceImages(prev => {
        const updatedFaceImages = [...prev, { src: imageSrc, score, embeddings }];
        console.log('อัปเดตรูปภาพ:', updatedFaceImages.length, 'รูป');
        
        // บันทึกข้อมูลลง localStorage
        localStorage.setItem('registrationFaceImages', JSON.stringify(updatedFaceImages));
        
        return updatedFaceImages;
      });
      
      // ลบข้อผิดพลาดถ้ามี
      if (errors.faces) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.faces;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ:', error);
    }
  }, [errors.faces]);
  
  // ลบภาพที่อัปโหลดไว้
  const handleRemoveImage = (index: number) => {
    setFaceImages(prev => {
      const updatedFaceImages = prev.filter((_, i) => i !== index);
      // บันทึกข้อมูลลง localStorage
      localStorage.setItem('registrationFaceImages', JSON.stringify(updatedFaceImages));
      return updatedFaceImages;
    });
  };
  
  // บันทึกข้อมูลและสมัครสมาชิก
  const handleSubmit = async () => {
    // ตรวจสอบว่ามีภาพใบหน้าขั้นต่ำตามที่กำหนด
    if (faceImages.length < MIN_FACE_IMAGES) {
      setErrors({ faces: `กรุณาถ่ายภาพหรืออัปโหลดภาพใบหน้าอย่างน้อย ${MIN_FACE_IMAGES} รูป (ขาดอีก ${imagesNeeded} รูป)` });
      return;
    }
    
    setIsUploading(true);
    setApiError(null);
    
    try {
      // ตรวจสอบว่ามีรูปภาพที่ยังไม่มี embeddings หรือไม่
      const missingEmbeddings = faceImages.some(img => !img.embeddings);
      
      if (missingEmbeddings) {
        console.log('กำลังสร้าง embeddings สำหรับรูปภาพที่ยังไม่มี...');
        
        // สร้าง embeddings สำหรับรูปภาพที่ยังไม่มี
        const imagesWithoutEmbeddings = faceImages.filter(img => !img.embeddings);
        await processNewFaceImages(imagesWithoutEmbeddings);
        
        // ดึงข้อมูลล่าสุดจาก localStorage
        const updatedFaceImages = localStorage.getItem('registrationFaceImages');
        if (updatedFaceImages) {
          const parsedImages = JSON.parse(updatedFaceImages);
          setFaceImages(parsedImages);
        }
      }
      
      // 1. ลงทะเบียนผู้ใช้กับ API
      const { username, email, password, firstName, lastName } = userData;
      const registerData = { username, email, password, firstName, lastName };
      
      // เรียกใช้ API ลงทะเบียน
      const registerResponse = await apiService.registerUser(registerData);
      const userId = registerResponse.user.id;
      
      console.log('ลงทะเบียนผู้ใช้สำเร็จ:', registerResponse);
      
      // 2. บันทึกข้อมูลใบหน้าของผู้ใช้
      // สำหรับแต่ละรูปภาพใบหน้า
      for (const faceImage of faceImages) {
        try {
          // ใช้ embeddings ที่มีอยู่แล้ว หรือสร้างใหม่ถ้าไม่มี
          const embeddings = faceImage.embeddings || await faceNetService.generateEmbeddings(faceImage.src);
          
          // สร้างข้อมูลที่จะส่งไปยัง API
          const faceData = {
            embeddings: embeddings,
            imageBase64: faceImage.src,
            score: faceImage.score
          };
          
          // บันทึกข้อมูลใบหน้าผ่าน API
          await apiService.storeFaceData(userId, faceData);
        } catch (faceError) {
          console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลใบหน้า:', faceError);
          // ทำต่อไปกับรูปถัดไป
        }
      }
      
      console.log('บันทึกข้อมูลใบหน้าสำเร็จ');
      
      // 3. ล้างข้อมูลใน localStorage หลังจากลงทะเบียนสำเร็จ
      localStorage.removeItem('registrationUserData');
      localStorage.removeItem('registrationFaceImages');
      localStorage.removeItem('registrationStep');
      
      // 4. เปลี่ยนเส้นทางหลังจากลงทะเบียนสำเร็จ
      router.push('/register/success');
    } catch (error: any) {
      console.error('Error registering:', error);
      setIsUploading(false);
      
      // ตรวจสอบประเภทข้อผิดพลาด
      if (error.response && error.response.data && error.response.data.message) {
        // ข้อผิดพลาดจาก API
        setApiError(error.response.data.message);
        
        // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับชื่อผู้ใช้ซ้ำหรือไม่
        if (error.response.data.message.includes('ชื่อผู้ใช้') || 
            error.response.data.message.includes('อีเมลนี้มีผู้ใช้งานแล้ว')) {
          // กลับไปขั้นตอนที่ 1 เพื่อแก้ไขข้อมูล
          setStep(1);
          setErrors({
            username: error.response.data.message
          });
        }
      } else {
        // ข้อผิดพลาดทั่วไป
        setApiError('เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // แสดงรูปภาพแบบขยาย
  const showFullImage = (imageSrc: string) => {
    setSelectedImage(imageSrc);
  };
  
  // ปิดรูปภาพแบบขยาย
  const closeFullImage = () => {
    setSelectedImage(null);
  };
  
  // รายการ URL ของรูปภาพที่มีอยู่แล้ว (ใช้สำหรับตรวจสอบรูปซ้ำ)
  const existingImageUrls = faceImages.map(img => img.src);
  
  // บังคับให้รีเรนเดอร์ทุกครั้งที่มีการเปลี่ยนแปลง faceImages
  useEffect(() => {
    console.log('รีเรนเดอร์หลังจากอัปเดตรูปภาพ - จำนวนรูปปัจจุบัน:', faceImages.length);
  }, [faceImages]);
  
  return (
    <TensorflowSetup>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            FaceSocial
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? 'สร้างบัญชีผู้ใช้' : 'เพิ่มข้อมูลใบหน้า'}
          </h2>
        </div>
        
        <div className="mt-8 mx-auto w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg transition-colors duration-200">
            {apiError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{apiError}</span>
              </div>
            )}
            
            {modelError && (
              <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{modelError}</span>
              </div>
            )}
            
            {step === 1 ? (
              <div>
                <Input
                  label="ชื่อผู้ใช้"
                  name="username"
                  type="text"
                  value={userData.username}
                  onChange={handleInputChange}
                  error={errors.username}
                  required
                />
                {isCheckingUsername && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                    <div className="animate-spin h-3 w-3 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
                    กำลังตรวจสอบชื่อผู้ใช้...
                  </div>
                )}
                
                <Input
                  label="อีเมล"
                  name="email"
                  type="email"
                  value={userData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  required
                />
                
                <Input
                  label="รหัสผ่าน"
                  name="password"
                  type="password"
                  value={userData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                  required
                  showPasswordToggle={true}
                />
                
                <Input
                  label="ยืนยันรหัสผ่าน"
                  name="confirmPassword"
                  type="password"
                  value={userData.confirmPassword}
                  onChange={handleInputChange}
                  error={errors.confirmPassword}
                  required
                  showPasswordToggle={true}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="ชื่อจริง"
                    name="firstName"
                    type="text"
                    value={userData.firstName}
                    onChange={handleInputChange}
                  />
                  
                  <Input
                    label="นามสกุล"
                    name="lastName"
                    type="text"
                    value={userData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="mt-6">
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full"
                    isLoading={isCheckingUsername}
                    disabled={isCheckingUsername || Boolean(errors.username)}
                  >
                    ต่อไป
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    กรุณาถ่ายภาพหรืออัปโหลดรูปภาพใบหน้าของคุณอย่างน้อย {MIN_FACE_IMAGES} รูป เพื่อใช้ในการยืนยันตัวตน
                  </p>
                  
                  {/* แสดงความคืบหน้า */}
                  <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ความคืบหน้า: {faceImages.length} / {MIN_FACE_IMAGES} รูป
                      </span>
                      <span className={`text-sm font-medium ${hasEnoughImages ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {hasEnoughImages ? 'ครบแล้ว' : `ขาดอีก ${imagesNeeded} รูป`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${hasEnoughImages ? 'bg-green-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${Math.min(100, (faceImages.length / MIN_FACE_IMAGES) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* ปุ่มถ่ายภาพ */}
                    <Link href="/register/capture?return=/register">
                      <Button variant="primary" className="w-full">
                        ถ่ายภาพใบหน้า
                      </Button>
                    </Link>
                    
                    {/* หรือ อัปโหลดรูป */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute h-px w-full bg-gray-300 dark:bg-gray-600"></div>
                      <span className="relative bg-white dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400">
                        หรือ
                      </span>
                    </div>
                    
                    {/* อัปโหลดไฟล์ - ส่งรายการรูปภาพที่มีอยู่แล้วเพื่อตรวจสอบรูปซ้ำ */}
                    <FileUploader 
                      onImageUploaded={handleImageUploaded} 
                      existingImages={existingImageUrls}
                      minRequired={MIN_FACE_IMAGES}
                      currentCount={faceImages.length}
                    />
                  </div>
                  
                  {errors.faces && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.faces}</p>
                  )}
                </div>
                
                {/* แสดงรูปภาพที่ถ่ายแล้ว */}
                {faceImages.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        รูปภาพที่ถ่ายแล้ว ({faceImages.length})
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {faceImages.map((img, index) => (
                        <div key={`face-${index}`} className="relative group">
                          <img 
                            src={img.src} 
                            alt={`Face ${index + 1}`} 
                            className="w-full h-auto rounded-md object-cover aspect-square cursor-pointer transition-all duration-200 hover:opacity-90"
                            onClick={() => showFullImage(img.src)}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                            <div className="flex justify-between items-center">
                              <span>คะแนน: {img.score}%</span>
                              {img.embeddings && (
                                <span className="bg-green-500 rounded-full w-2 h-2" title="มี embeddings"></span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs"
                            aria-label="ลบรูปภาพ"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                  >
                    ย้อนกลับ
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    isLoading={isUploading}
                    disabled={!hasEnoughImages || isUploading}
                  >
                    ลงทะเบียน
                    {!hasEnoughImages && ` (ต้องการอีก ${imagesNeeded} รูป)`}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                มีบัญชีผู้ใช้อยู่แล้ว?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal สำหรับแสดงรูปภาพขนาดใหญ่ */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeFullImage}
        >
          <div className="relative max-w-4xl w-full max-h-screen" onClick={e => e.stopPropagation()}>
            <div className="bg-white p-2 rounded-lg shadow-lg">
              <img 
                src={selectedImage} 
                alt="Enlarged face" 
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
              <button 
                className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                onClick={closeFullImage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* แสดงข้อมูลการดีบัก (ซ่อนในโหมดโปรดักชัน) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
          จำนวนรูปภาพ: {faceImages.length} / {MIN_FACE_IMAGES}
          <br />
          มี Embeddings: {faceImages.filter(img => img.embeddings).length}
        </div>
      )}
    </TensorflowSetup>
  );
}
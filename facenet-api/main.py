# facenet-api/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import cv2
import os
import base64
import io
from PIL import Image
from face_net_service import FaceNetService
import sys
import traceback

app = FastAPI(title="FaceNet API", description="API สำหรับสร้าง Face Embeddings")

# เพิ่ม CORS middleware - แก้ไขเพื่อรองรับ Ngrok
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # อนุญาตทุกโดเมน (สำหรับการทดสอบเท่านั้น)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# แก้ไขการกำหนด path ของโมเดล
MODEL_PATH = os.environ.get('MODEL_PATH') 

# ถ้าไม่มี environment variable ให้ใช้ path แบบ absolute
if not MODEL_PATH:
    # เปลี่ยนเป็น path จริงของคุณ
    MODEL_PATH = "D:/โปรเจคจบ/Web/facesocial/models/facenet/20180402-114759/20180402-114759.pb"
    print(f"ใช้ MODEL_PATH แบบ hardcode: {MODEL_PATH}")

print(f"กำลังค้นหาโมเดลที่: {MODEL_PATH}")
print(f"ไฟล์มีอยู่จริง: {os.path.exists(MODEL_PATH) if MODEL_PATH else False}")

# ตรวจสอบว่ามีโมเดลหรือไม่
if not MODEL_PATH or not os.path.exists(MODEL_PATH):
    print(f"ไม่พบไฟล์โมเดล: {MODEL_PATH}")
    print("กำลังใช้โหมด Dummy API แทน...")
    use_dummy_mode = True
else:
    print(f"พบโมเดลที่: {MODEL_PATH}")
    use_dummy_mode = False

# สร้าง FaceNet service (ถ้าไม่ใช่โหมด Dummy)
face_service = None
if not use_dummy_mode:
    try:
        face_service = FaceNetService(MODEL_PATH)
        print("โหลดโมเดล FaceNet สำเร็จ")
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการโหลดโมเดล: {e}")
        traceback.print_exc()
        print("กำลังใช้โหมด Dummy API แทน...")
        use_dummy_mode = True

# สร้าง embeddings จำลองสำหรับ Dummy mode
def generate_dummy_embeddings():
    # สร้าง embeddings จำลอง 128 มิติ
    dummy_embeddings = np.random.uniform(-1, 1, 128).tolist()
    
    # Normalize
    squared_sum = sum(x**2 for x in dummy_embeddings)
    vector_length = np.sqrt(squared_sum)
    return [x / vector_length for x in dummy_embeddings]

@app.get("/")
async def root():
    if use_dummy_mode:
        return {"message": "FaceNet API ทำงานในโหมด Dummy (ไม่พบโมเดล)"}
    return {"message": "FaceNet API พร้อมใช้งาน"}

@app.post("/generate-embeddings/file/")
async def generate_embeddings_file(file: UploadFile = File(...)):
    """สร้าง embeddings จากไฟล์รูปภาพ"""
    try:
        # ถ้าเป็นโหมด Dummy ให้ส่ง dummy embeddings กลับไป
        if use_dummy_mode:
            return {"embeddings": generate_dummy_embeddings()}
            
        # อ่านไฟล์
        contents = await file.read()
        print(f"อ่านไฟล์สำเร็จ ขนาด: {len(contents)} bytes")
        
        # ตรวจสอบว่าไฟล์ว่างเปล่าหรือไม่
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="ไฟล์ว่างเปล่า")
            
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # ตรวจสอบว่า decode สำเร็จหรือไม่
        if img is None:
            raise HTTPException(status_code=400, detail="ไม่สามารถอ่านรูปภาพได้ ตรวจสอบรูปแบบไฟล์")
            
        print(f"รูปภาพมีขนาด: {img.shape}")
        
        # สร้าง embeddings
        embeddings = face_service.generate_embeddings(img)
        
        if embeddings is None:
            raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปภาพหรือไม่สามารถสร้าง embeddings ได้")
        
        return {"embeddings": embeddings}
    except HTTPException:
        # ส่งต่อ HTTPException ที่กำหนดเอง
        raise
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"เกิดข้อผิดพลาดในการสร้าง embeddings จากไฟล์: {e}")
        print(traceback_str)
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: {str(e)}")

@app.post("/generate-embeddings/base64/")
async def generate_embeddings_base64(image_data: str = Form(...)):
    """สร้าง embeddings จากรูปภาพที่เข้ารหัสด้วย Base64"""
    try:
        # ถ้าเป็นโหมด Dummy ให้ส่ง dummy embeddings กลับไป
        if use_dummy_mode:
            return {"embeddings": generate_dummy_embeddings()}
        
        # ตรวจสอบว่าเป็น data URL หรือ base64 string เปล่าๆ
        if "data:" in image_data and ";base64," in image_data:
            image_data = image_data.split(";base64,")[1]
        
        # แปลง base64 เป็นรูปภาพ
        try:
            img_data = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(img_data))
            img = np.array(image)
        except Exception as e:
            print(f"ไม่สามารถแปลง base64 เป็นรูปภาพได้: {e}")
            raise HTTPException(status_code=400, detail="รูปแบบ base64 ไม่ถูกต้อง")
        
        # ตรวจสอบช่องสีและแปลงเป็น RGB ถ้าจำเป็น
        if len(img.shape) == 3 and img.shape[2] == 4:  # มีช่อง alpha
            img = img[:, :, :3]
        
        # สร้าง embeddings
        embeddings = face_service.generate_embeddings(img)
        
        if embeddings is None:
            raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปภาพหรือไม่สามารถสร้าง embeddings ได้")
        
        return {"embeddings": embeddings}
    except HTTPException:
        # ส่งต่อ HTTPException ที่กำหนดเอง
        raise
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"เกิดข้อผิดพลาดในการสร้าง embeddings จาก base64: {e}")
        print(traceback_str)
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: {str(e)}")

@app.get("/health")
async def health_check():
    """ตรวจสอบสถานะของ API"""
    if use_dummy_mode:
        return {"status": "dummy_mode", "message": "API ทำงานในโหมด Dummy (ไม่พบโมเดล)"}
    return {"status": "ok", "model": "FaceNet 20180402-114759"}

if __name__ == "__main__":
    # แสดงข้อมูล python path
    print(f"Python Path: {sys.path}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
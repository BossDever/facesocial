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
import json

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
        
        # ตรวจสอบขนาดรูปภาพ
        if img.shape[0] < 160 or img.shape[1] < 160:
            raise HTTPException(status_code=400, detail="รูปภาพมีขนาดเล็กเกินไป (ต้องการอย่างน้อย 160x160 พิกเซล)")
        
        # สร้าง embeddings
        embeddings = face_service.generate_embeddings(img)
        
        if embeddings is None:
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "ไม่พบใบหน้าในรูปภาพหรือคุณภาพไม่เพียงพอ",
                    "error_code": "FACE_QUALITY_ERROR",
                    "suggestions": [
                        "ถ่ายภาพในที่ที่มีแสงสว่างเพียงพอ",
                        "จัดให้ใบหน้าอยู่ตรงกลางและมองเห็นได้ชัดเจน",
                        "ถ่ายตรงๆ ไม่เอียงมากเกินไป",
                        "ไม่สวมแว่นตาหรืออุปกรณ์ที่บดบังใบหน้า"
                    ]
                }
            )
        
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
        
        # ตรวจสอบขนาดรูปภาพ
        if img.shape[0] < 160 or img.shape[1] < 160:
            raise HTTPException(status_code=400, detail="รูปภาพมีขนาดเล็กเกินไป (ต้องการอย่างน้อย 160x160 พิกเซล)")
        
        # ตรวจสอบช่องสีและแปลงเป็น RGB ถ้าจำเป็น
        if len(img.shape) == 3 and img.shape[2] == 4:  # มีช่อง alpha
            img = img[:, :, :3]
        
        # สร้าง embeddings
        embeddings = face_service.generate_embeddings(img)
        
        if embeddings is None:
            error_response = {
                "message": "ไม่พบใบหน้าในรูปภาพหรือคุณภาพไม่เพียงพอ",
                "error_code": "FACE_QUALITY_ERROR",
                "suggestions": [
                    "ถ่ายภาพในที่ที่มีแสงสว่างเพียงพอ",
                    "จัดให้ใบหน้าอยู่ตรงกลางและมองเห็นได้ชัดเจน",
                    "ถ่ายตรงๆ ไม่เอียงมากเกินไป",
                    "ไม่สวมแว่นตาหรืออุปกรณ์ที่บดบังใบหน้า"
                ]
            }
            
            # แปลงเป็น JSON string เพื่อให้ FastAPI แสดงข้อความผิดพลาดแบบมีโครงสร้าง
            detail_str = json.dumps(error_response)
            raise HTTPException(status_code=400, detail=detail_str)
        
        return {"embeddings": embeddings}
    except HTTPException:
        # ส่งต่อ HTTPException ที่กำหนดเอง
        raise
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"เกิดข้อผิดพลาดในการสร้าง embeddings จาก base64: {e}")
        print(traceback_str)
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: {str(e)}")

@app.post("/detect")
async def detect_faces(image_data: str = Form(...)):
    """ตรวจจับใบหน้าในรูปภาพ"""
    try:
        # ถ้าเป็นโหมด Dummy ให้ส่งผลลัพธ์จำลองกลับไป
        if use_dummy_mode:
            return {
                "faceDetected": True,
                "score": 92.5,
                "faceCount": 1,
                "faceBox": {
                    "top": 50,
                    "left": 50,
                    "width": 200,
                    "height": 200
                },
                "isDummy": True
            }
        
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
        
        # ตรวจสอบขนาดรูปภาพ
        if img.shape[0] < 160 or img.shape[1] < 160:
            raise HTTPException(status_code=400, detail="รูปภาพมีขนาดเล็กเกินไป (ต้องการอย่างน้อย 160x160 พิกเซล)")
        
        # ตรวจสอบช่องสีและแปลงเป็น RGB ถ้าจำเป็น
        if len(img.shape) == 3 and img.shape[2] == 4:  # มีช่อง alpha
            img = img[:, :, :3]
        
        # ตรวจจับใบหน้า
        results = face_service.detector.detect_faces(img)
        print(f"พบใบหน้า {len(results)} ใบหน้า")
        
        # ถ้าไม่พบใบหน้า
        if not results:
            return {
                "faceDetected": False,
                "score": 0,
                "faceCount": 0,
                "message": "ไม่พบใบหน้าในรูปภาพ"
            }
        
        # ถ้าพบใบหน้ามากกว่า 1 ใบ
        if len(results) > 1:
            return {
                "faceDetected": True,
                "score": results[0].get('confidence', 0.8) * 100,
                "faceCount": len(results),
                "message": f"พบใบหน้า {len(results)} ใบหน้า โปรดใช้รูปภาพที่มีใบหน้าเดียวเท่านั้น",
                "faceBox": {
                    "top": results[0]['box'][1],
                    "left": results[0]['box'][0],
                    "width": results[0]['box'][2],
                    "height": results[0]['box'][3]
                }
            }
        
        # ถ้าพบใบหน้า 1 ใบ
        result = results[0]
        confidence = result.get('confidence', 0.8)
        score = confidence * 100
        
        # ตรวจสอบคุณภาพรูปภาพ (ความชัด)
        x, y, w, h = result['box']
        face_roi = img[max(0, y):y+h, max(0, x):x+w]
        if face_roi.size > 0:  # มีพิกเซลในใบหน้า
            gray_face = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
            laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            
            # ปรับคะแนนตามความชัด
            clarity_score = min(100, laplacian_var / 10)
            # ปรับน้ำหนักระหว่างความมั่นใจและความชัด
            final_score = 0.7 * score + 0.3 * clarity_score
        else:
            final_score = score
        
        return {
            "faceDetected": True,
            "score": final_score,
            "faceCount": 1,
            "confidence": confidence * 100,
            "clarity": laplacian_var if 'laplacian_var' in locals() else None,
            "faceBox": {
                "top": max(0, result['box'][1]),
                "left": max(0, result['box'][0]),
                "width": result['box'][2],
                "height": result['box'][3]
            }
        }
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"เกิดข้อผิดพลาดในการตรวจจับใบหน้า: {e}")
        print(traceback_str)
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: {str(e)}")

@app.post("/compare")
async def compare_faces(image1: str, image2: str):
    """เปรียบเทียบใบหน้าสองใบหน้า"""
    try:
        # ถ้าเป็นโหมด Dummy ให้ส่งผลลัพธ์จำลองกลับไป
        if use_dummy_mode:
            similarity = 0.7 + (np.random.random() * 0.3)
            return {
                "similarity": similarity,
                "isSame": similarity > 0.8,
                "distance": 1 - similarity,
                "isDummy": True
            }
            
        # แปลง base64 เป็นรูปภาพ
        # รูปที่ 1
        if "data:" in image1 and ";base64," in image1:
            image1 = image1.split(";base64,")[1]
        
        try:
            img_data1 = base64.b64decode(image1)
            image1_obj = Image.open(io.BytesIO(img_data1))
            img1 = np.array(image1_obj)
        except Exception as e:
            print(f"ไม่สามารถแปลง base64 ของรูปที่ 1 เป็นรูปภาพได้: {e}")
            raise HTTPException(status_code=400, detail="รูปแบบ base64 ของรูปที่ 1 ไม่ถูกต้อง")
            
        # รูปที่ 2
        if "data:" in image2 and ";base64," in image2:
            image2 = image2.split(";base64,")[1]
            
        try:
            img_data2 = base64.b64decode(image2)
            image2_obj = Image.open(io.BytesIO(img_data2))
            img2 = np.array(image2_obj)
        except Exception as e:
            print(f"ไม่สามารถแปลง base64 ของรูปที่ 2 เป็นรูปภาพได้: {e}")
            raise HTTPException(status_code=400, detail="รูปแบบ base64 ของรูปที่ 2 ไม่ถูกต้อง")
            
        # สร้าง embeddings จากทั้งสองรูป
        embeddings1 = face_service.generate_embeddings(img1)
        if embeddings1 is None:
            raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปภาพที่ 1 หรือคุณภาพไม่เพียงพอ")
            
        embeddings2 = face_service.generate_embeddings(img2)
        if embeddings2 is None:
            raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปภาพที่ 2 หรือคุณภาพไม่เพียงพอ")
            
        # คำนวณระยะห่างระหว่างใบหน้า (Euclidean distance)
        embeddings1_np = np.array(embeddings1)
        embeddings2_np = np.array(embeddings2)
        
        distance = np.linalg.norm(embeddings1_np - embeddings2_np)
        
        # แปลงระยะห่างเป็นความเหมือน (0-1)
        # ค่าระยะห่าง Euclidean ที่มากกว่า 0.8 จะถือว่าเป็นคนละคน
        max_distance = 1.2
        similarity = max(0, 1 - (distance / max_distance))
        
        return {
            "similarity": similarity,
            "isSame": similarity > 0.8,
            "distance": distance,
            "threshold": 0.8
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"เกิดข้อผิดพลาดในการเปรียบเทียบใบหน้า: {e}")
        print(traceback_str)
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: {str(e)}")

@app.get("/health")
async def health_check():
    """ตรวจสอบสถานะของ API"""
    if use_dummy_mode:
        return {"status": "dummy_mode", "message": "API ทำงานในโหมด Dummy (ไม่พบโมเดล)"}
    
    # ทดสอบการสร้าง embeddings จากรูปภาพทดสอบ
    try:
        # สร้างรูปภาพทดสอบขนาด 160x160 สีขาว
        test_img = np.ones((160, 160, 3), dtype=np.uint8) * 255
        
        # วาดรูปใบหน้าอย่างง่ายๆ (วงกลมสำหรับใบหน้า, วงกลมสำหรับตา, เส้นสำหรับปาก)
        cv2.circle(test_img, (80, 80), 60, (200, 200, 200), -1)  # ใบหน้า
        cv2.circle(test_img, (60, 65), 10, (0, 0, 0), -1)  # ตาซ้าย
        cv2.circle(test_img, (100, 65), 10, (0, 0, 0), -1)  # ตาขวา
        cv2.ellipse(test_img, (80, 100), (20, 10), 0, 0, 180, (0, 0, 0), 2)  # ปาก
        
        # ทดสอบตรวจจับใบหน้า
        faces = face_service.detector.detect_faces(test_img)
        
        return {
            "status": "ok",
            "model": "FaceNet 20180402-114759",
            "face_detection_test": len(faces) > 0,
            "gpu_available": len(tf.config.list_physical_devices('GPU')) > 0
        }
    except Exception as e:
        return {
            "status": "warning",
            "message": f"API ทำงานแต่มีปัญหาในการทดสอบ: {str(e)}",
            "model": "FaceNet 20180402-114759"
        }

if __name__ == "__main__":
    # แสดงข้อมูล python path
    print(f"Python Path: {sys.path}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
import tensorflow as tf
import numpy as np
import cv2
from mtcnn.mtcnn import MTCNN
import os

class FaceNetService:
    def __init__(self, model_path):
        print(f"กำลังโหลดโมเดล FaceNet จาก {model_path}")
        
        # โหลดโมเดล FaceNet จากไฟล์ .pb
        with tf.io.gfile.GFile(model_path, 'rb') as f:
            graph_def = tf.compat.v1.GraphDef()
            graph_def.ParseFromString(f.read())
        
        # สร้าง graph
        self.graph = tf.Graph()
        with self.graph.as_default():
            tf.import_graph_def(graph_def, name='')
            self.sess = tf.compat.v1.Session(graph=self.graph)
        
        # ตัวตรวจจับใบหน้า MTCNN
        self.detector = MTCNN()
        
        # ทดสอบ graph
        try:
            input_tensor = self.graph.get_tensor_by_name('input:0')
            output_tensor = self.graph.get_tensor_by_name('embeddings:0')
            print(f"Input tensor shape: {input_tensor.shape}")
            print(f"Output tensor shape: {output_tensor.shape}")
        except Exception as e:
            print(f"ไม่สามารถดึง tensors จาก graph ได้: {e}")
        
        print(f"โหลดโมเดล FaceNet จาก {model_path} สำเร็จ")
    
    def preprocess_image(self, img):
        """แปลงรูปภาพให้เหมาะสมกับ FaceNet"""
        try:
            # ตรวจสอบประเภทของข้อมูลรูปภาพ
            if isinstance(img, str):
                # ถ้าเป็น path ของไฟล์
                img = cv2.imread(img)
                if img is None:
                    print(f"ไม่สามารถอ่านรูปภาพได้")
                    return None
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            elif isinstance(img, np.ndarray):
                # ถ้าเป็น numpy array (BGR จาก OpenCV)
                if len(img.shape) == 3 and img.shape[2] == 3:  # ตรวจสอบว่าเป็นรูป RGB/BGR
                    # ตรวจสอบและแปลงจาก BGR เป็น RGB ถ้าจำเป็น
                    if img.dtype == np.uint8:
                        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                else:
                    print(f"รูปแบบรูปภาพไม่ถูกต้อง: shape={img.shape}")
            
            print(f"รูปภาพที่จะประมวลผลมีขนาด: {img.shape}")
            
            # ตรวจจับใบหน้า
            results = self.detector.detect_faces(img)
            if not results:
                print("ไม่พบใบหน้าในรูปภาพ")
                return None
            
            print(f"พบใบหน้า {len(results)} ใบหน้า")
            
            # ใช้ใบหน้าแรกที่พบ
            x, y, width, height = results[0]['box']
            # ป้องกันค่าติดลบ
            x, y = max(0, x), max(0, y)
            face = img[y:y+height, x:x+width]
            
            # ตรวจสอบว่าสามารถตัดใบหน้าได้
            if face.size == 0:
                print("ไม่สามารถตัดส่วนใบหน้าได้ (ขนาดเป็น 0)")
                return None
            
            print(f"ใบหน้าที่ตัดได้มีขนาด: {face.shape}")
            
            # ปรับขนาดเป็น 160x160 (ตามที่ FaceNet ต้องการ)
            try:
                face = cv2.resize(face, (160, 160))
                print("ปรับขนาดใบหน้าเป็น 160x160 สำเร็จ")
            except Exception as e:
                print(f"ไม่สามารถปรับขนาดใบหน้าได้: {e}")
                return None
            
            # แปลงเป็น float32 และ normalize (prewhiten)
            face = face.astype(np.float32)
            mean = np.mean(face)
            std = np.std(face)
            std_adj = np.maximum(std, 1.0/np.sqrt(face.size))
            face = (face - mean) / std_adj
            
            return face
        except Exception as e:
            print(f"เกิดข้อผิดพลาดในการเตรียมรูปภาพ: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def generate_embeddings(self, img):
        """สร้าง embeddings จากรูปภาพใบหน้า"""
        # เตรียมรูปภาพ
        face = self.preprocess_image(img)
        if face is None:
            return None
        
        # เพิ่มมิติแรก (batch)
        face = np.expand_dims(face, axis=0)
        
        # ส่งเข้าโมเดล FaceNet
        try:
            with self.graph.as_default():
                # เพิ่มค่า phase_train=False เพื่อแก้ไขปัญหา
                embeddings = self.sess.run('embeddings:0', feed_dict={
                    'input:0': face,
                    'phase_train:0': False
                })
            
            print(f"สร้าง embeddings สำเร็จ ขนาด: {embeddings.shape}")
            
            # คืนค่า embeddings
            return embeddings[0].tolist()
        except Exception as e:
            print(f"เกิดข้อผิดพลาดในการสร้าง embeddings: {e}")
            import traceback
            traceback.print_exc()
            return None
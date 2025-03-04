import tensorflow as tf
import numpy as np
import cv2
from mtcnn.mtcnn import MTCNN
import os

class FaceNetService:
    def __init__(self, model_path):
        print(f"กำลังโหลดโมเดล FaceNet จาก {model_path}")
        
        # ตั้งค่า GPU
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            try:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                print(f"พบ GPU {len(gpus)} เครื่อง และตั้งค่าเรียบร้อยแล้ว")
            except RuntimeError as e:
                print(f"Error setting GPU memory growth: {e}")
                
        # โหลดโมเดล FaceNet จากไฟล์ .pb
        with tf.io.gfile.GFile(model_path, 'rb') as f:
            graph_def = tf.compat.v1.GraphDef()
            graph_def.ParseFromString(f.read())
        
        # สร้าง graph
        self.graph = tf.Graph()
        with self.graph.as_default():
            tf.import_graph_def(graph_def, name='')
            # สร้าง session แบบ GPU-optimized
            gpu_options = tf.compat.v1.GPUOptions(allow_growth=True)
            config = tf.compat.v1.ConfigProto(gpu_options=gpu_options,
                                           allow_soft_placement=True)
            config.gpu_options.per_process_gpu_memory_fraction = 0.7
            self.sess = tf.compat.v1.Session(graph=self.graph, config=config)
        
        # ตัวตรวจจับใบหน้า MTCNN ที่เข้มงวดขึ้น
        self.detector = MTCNN(min_face_size=80, steps_threshold=[0.6, 0.7, 0.9])
        
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
                    return None
            
            print(f"รูปภาพที่จะประมวลผลมีขนาด: {img.shape}")
            
            # ปรับปรุงคุณภาพรูปภาพ (เพิ่มความชัด)
            lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            lab = cv2.merge((l, a, b))
            img = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            
            # ตรวจจับใบหน้า
            results = self.detector.detect_faces(img)
            if not results:
                print("ไม่พบใบหน้าในรูปภาพ")
                return None
            
            print(f"พบใบหน้า {len(results)} ใบหน้า")
            
            # ตรวจสอบความมั่นใจในการตรวจจับ
            result = results[0]
            confidence = result.get('confidence', 0)
            if confidence < 0.95:
                print(f"ความมั่นใจในการตรวจจับใบหน้าต่ำเกินไป: {confidence:.2f}")
                return None
            
            # ขยายกรอบใบหน้าออกไป 30%
            x, y, width, height = result['box']
            # ป้องกันค่าติดลบ
            x, y = max(0, x), max(0, y)
            
            # คำนวณจุดกึ่งกลางและขยายกรอบ
            center_x, center_y = x + width // 2, y + height // 2
            new_half_size = int(max(width, height) * 0.65)  # ขยาย 30%
            
            # คำนวณกรอบใหม่
            new_x = max(0, center_x - new_half_size)
            new_y = max(0, center_y - new_half_size)
            new_width = min(img.shape[1] - new_x, new_half_size * 2)
            new_height = min(img.shape[0] - new_y, new_half_size * 2)
            
            # ตัดส่วนใบหน้า
            face = img[new_y:new_y+new_height, new_x:new_x+new_width]
            
            # ตรวจสอบว่าสามารถตัดใบหน้าได้
            if face.size == 0:
                print("ไม่สามารถตัดส่วนใบหน้าได้ (ขนาดเป็น 0)")
                return None
            
            # ตรวจสอบความชัดของภาพ
            gray_face = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)
            laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            if laplacian_var < 100:
                print(f"ภาพใบหน้าไม่ชัดพอ: {laplacian_var:.2f}")
                return None
            
            print(f"ใบหน้าที่ตัดได้มีขนาด: {face.shape}, ความชัด: {laplacian_var:.2f}")
            
            # ปรับขนาดเป็น 160x160 (ตามที่ FaceNet ต้องการ)
            try:
                face = cv2.resize(face, (160, 160), interpolation=cv2.INTER_CUBIC)
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
            print("preprocess_image ล้มเหลว ไม่สามารถสร้าง embeddings ได้")
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
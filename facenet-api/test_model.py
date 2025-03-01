import tensorflow as tf
import numpy as np
import cv2
from mtcnn.mtcnn import MTCNN
import os
import sys

def test_model(model_path, image_path):
    print(f"Python version: {sys.version}")
    print(f"TensorFlow version: {tf.__version__}")
    
    # โหลด MTCNN
    print("กำลังโหลด MTCNN...")
    detector = MTCNN()
    print("โหลด MTCNN สำเร็จ")
    
    # โหลดรูปภาพ
    print(f"กำลังโหลดรูปภาพจาก {image_path}...")
    img = cv2.imread(image_path)
    if img is None:
        print(f"ไม่สามารถโหลดรูปภาพจาก {image_path}")
        return
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    print(f"โหลดรูปภาพสำเร็จ ขนาด: {img.shape}")
    
    # ตรวจจับใบหน้า
    print("กำลังตรวจจับใบหน้า...")
    results = detector.detect_faces(img_rgb)
    if not results:
        print("ไม่พบใบหน้าในรูปภาพ")
        return
    
    print(f"พบใบหน้า {len(results)} ใบหน้า")
    
    # ใช้ใบหน้าแรก
    x, y, width, height = results[0]['box']
    x, y = max(0, x), max(0, y)
    face = img_rgb[y:y+height, x:x+width]
    
    # ปรับขนาดเป็น 160x160
    face_resized = cv2.resize(face, (160, 160))
    
    # Prewhiten
    face_resized = face_resized.astype(np.float32)
    mean = np.mean(face_resized)
    std = np.std(face_resized)
    std_adj = np.maximum(std, 1.0/np.sqrt(face_resized.size))
    face_norm = (face_resized - mean) / std_adj
    
    # โหลดโมเดล FaceNet
    print(f"กำลังโหลดโมเดล FaceNet จาก {model_path}...")
    try:
        with tf.io.gfile.GFile(model_path, 'rb') as f:
            graph_def = tf.compat.v1.GraphDef()
            graph_def.ParseFromString(f.read())
        
        # สร้าง graph
        graph = tf.Graph()
        with graph.as_default():
            tf.import_graph_def(graph_def, name='')
            sess = tf.compat.v1.Session(graph=graph)
        
        print("โหลดโมเดล FaceNet สำเร็จ")
        
        # แสดงรายการ operations และ tensors ใน graph
        operations = graph.get_operations()
        print(f"จำนวน operations ใน graph: {len(operations)}")
        print("ตัวอย่าง operations 10 อันแรก:")
        for i, op in enumerate(operations[:10]):
            print(f"  {i}: {op.name} (type: {op.type})")
        
        print("\nตรวจสอบ placeholders:")
        placeholders = [op for op in operations if op.type == 'Placeholder']
        for ph in placeholders:
            print(f"  Placeholder: {ph.name}")
        
        # เพิ่มมิติ batch
        face_batch = np.expand_dims(face_norm, axis=0)
        
        # สร้าง embeddings
        with graph.as_default():
            # ตรวจสอบว่ามี placeholder 'phase_train' หรือไม่
            has_phase_train = False
            for ph in placeholders:
                if 'phase_train' in ph.name:
                    has_phase_train = True
                    break
            
            # สร้าง feed_dict ที่เหมาะสม
            feed_dict = {'input:0': face_batch}
            if has_phase_train:
                feed_dict['phase_train:0'] = False
                print("ใช้ phase_train = False สำหรับการ inference")
            
            # Run graph
            embeddings = sess.run('embeddings:0', feed_dict=feed_dict)
        
        print(f"สร้าง embeddings สำเร็จ ขนาด: {embeddings.shape}")
        print(f"10 ค่าแรกของ embeddings: {embeddings[0][:10]}")
        return True
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการโหลดหรือใช้งานโมเดล: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # เลือกโมเดลที่จะทดสอบ
    model_path = "/app/models/facenet/20180402-114759/20180402-114759.pb"
    
    # ใช้รูปทดสอบ
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # ถ้าไม่มีการระบุไฟล์ ให้ลองหาไฟล์รูปภาพในโฟลเดอร์ปัจจุบัน
        image_files = [f for f in os.listdir('.') if f.endswith(('.jpg', '.jpeg', '.png'))]
        if image_files:
            image_path = image_files[0]
            print(f"ใช้ไฟล์ {image_path} เป็นรูปทดสอบ")
        else:
            # สร้างรูปทดสอบอย่างง่าย
            print("ไม่พบไฟล์รูปภาพ กำลังสร้างรูปทดสอบ...")
            test_img = np.ones((300, 300, 3), dtype=np.uint8) * 200  # รูปสีเทาอ่อน
            cv2.imwrite('test_image.jpg', test_img)
            image_path = 'test_image.jpg'
    
    test_model(model_path, image_path)
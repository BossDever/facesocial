FROM python:3.9-slim

WORKDIR /app

# ติดตั้ง dependencies สำหรับ OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# คัดลอกไฟล์ requirements
COPY requirements.txt .

# ติดตั้ง dependencies
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกโค้ด
COPY . .

# คัดลอกโมเดล FaceNet (ถ้าโมเดลอยู่ในโฟลเดอร์ models)
# COPY ../models/facenet/20180402-114759.pb /app/models/

# รัน API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
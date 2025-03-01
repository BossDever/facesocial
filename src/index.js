const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Status Route
app.get('/api/auth/status', (req, res) => {
  // ข้อมูลตัวอย่าง API status
  const apiStatus = [
    { 
      name: 'Authentication API', 
      status: 'active',
      endpoint: '/api/auth', 
      responseTime: 120,
      successRate: 99.8,
      lastChecked: new Date().toLocaleString() 
    },
    { 
      name: 'User API', 
      status: 'active',
      endpoint: '/api/users', 
      responseTime: 150,
      successRate: 99.5,
      lastChecked: new Date().toLocaleString() 
    },
    { 
      name: 'Post API', 
      status: 'degraded',
      endpoint: '/api/posts', 
      responseTime: 320,
      successRate: 95.2,
      details: 'การตอบสนองช้ากว่าปกติ',
      lastChecked: new Date().toLocaleString() 
    },
    { 
      name: 'Face Recognition API', 
      status: 'active',
      endpoint: '/api/face', 
      responseTime: 180,
      successRate: 98.7,
      lastChecked: new Date().toLocaleString() 
    }
  ];
  
  res.status(200).json(apiStatus);
});

// Register Route
app.post('/api/auth/register', (req, res) => {
  res.status(201).json({
    message: 'ลงทะเบียนสำเร็จ',
    user: {
      id: 'user-' + Date.now(),
      username: req.body.username,
      email: req.body.email
    }
  });
});

// Face Data Route
app.post('/api/auth/face-data/:userId', (req, res) => {
  res.status(201).json({
    message: 'บันทึกข้อมูลใบหน้าสำเร็จ',
    faceData: {
      id: 'face-' + Date.now(),
      userId: req.params.userId
    }
  });
});

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'FaceSocial API is running',
    timestamp: new Date()
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
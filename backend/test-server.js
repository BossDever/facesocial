// backend/test-server.js
const express = require('express');
const cors = require('cors');

// สร้าง Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Status Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'FaceSocial API is running',
    timestamp: new Date()
  });
});

// สร้าง API จำลองสำหรับ Posts
app.get('/api/posts', (req, res) => {
  res.status(200).json({
    posts: [
      {
        id: '1',
        content: 'ทดสอบโพสต์ 1',
        createdAt: new Date(),
        user: {
          id: '1',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User'
        }
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    }
  });
});

// API Status ทั้งหมด
app.get('/api/auth/status', (req, res) => {
  res.status(200).json([
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
      status: 'active',
      endpoint: '/api/posts', 
      responseTime: 180,
      successRate: 98.7,
      lastChecked: new Date().toLocaleString() 
    }
  ]);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API health check: http://localhost:${PORT}/api/health`);
});

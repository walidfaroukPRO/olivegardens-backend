const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ========================================
// CORS CONFIGURATION
// ========================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://olivegardens-frontend.vercel.app',
      'https://olivegardens-frontend-hg9dm1gsv-olivegardens11s-projects.vercel.app',
      process.env.CLIENT_URL,
      process.env.CLIENT_URL_PRODUCTION,
    ].filter(Boolean);

    // السماح بـ requests بدون origin (Postman, Mobile apps, etc)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(null, true); // Allow anyway in production (or use: callback(new Error('Not allowed by CORS')))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (NOT NEEDED with Cloudinary, but keep for backward compatibility)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================================
// DATABASE CONNECTION
// ========================================
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`⚡ Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Connection events
    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check MongoDB Atlas Network Access');
    console.log('2. Verify MONGODB_URI in environment variables');
    console.log('3. Ensure cluster is active\n');
    process.exit(1);
  }
};

connectDB();

// ========================================
// ROUTES
// ========================================
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const galleryRoutes = require('./routes/gallery');
const contactRoutes = require('./routes/contact');
const contentRoutes = require('./routes/content');
const usersRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', usersRoutes);

// ========================================
// HEALTH CHECK
// ========================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🫒 OliveGardens API',
    status: 'running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Connected' : 'Not configured'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured'
  });
});

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ========================================
// ERROR HANDLER
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
  }
  
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// PORT HANDLING
// ========================================
const PORT = process.env.PORT || 5000;

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log('\n🚀 ========================================');
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'}`);
    console.log(`🔗 Local: http://localhost:${port}`);
    console.log(`💚 Health: http://localhost:${port}/api/health`);
    console.log(`🌐 API Docs: http://localhost:${port}/`);
    console.log('🚀 ========================================\n');
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server Error:', err);
      process.exit(1);
    }
  });

  // Graceful Shutdown
  const shutdown = (signal) => {
    console.log(`\n👋 ${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('✅ Server closed');
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
};

startServer(PORT);
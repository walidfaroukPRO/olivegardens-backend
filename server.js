const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// ✅ CRITICAL: Load environment variables FIRST
dotenv.config();

const app = express();

// ========================================
// CORS CONFIGURATION - Allow localhost
// ========================================
const corsOptions = {
  origin: function (origin, callback) {
    // ✅ IMPORTANT: Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      process.env.CLIENT_URL,
      process.env.CLIENT_URL_PRODUCTION,
    ].filter(Boolean);

    // Check exact matches
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Allow all Vercel deployments
    if (origin.includes('olivegardens-frontend') && origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // Log blocked origin but allow anyway for development
    console.warn('⚠️ CORS origin:', origin);
    callback(null, true); // ✅ Allow all in development
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));

// ========================================
// MIDDLEWARE
// ========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Railway/Render
app.set('trust proxy', 1);

// ========================================
// DATABASE CONNECTION
// ========================================
const connectDB = async () => {
  try {
    console.log('\n🔍 ========================================');
    console.log('🔍 Environment Variables Check');
    console.log('🔍 ========================================');
    console.log('NODE_ENV:', process.env.NODE_ENV || '⚠️ not set (defaulting to development)');
    console.log('PORT:', process.env.PORT || '⚠️ not set (defaulting to 5000)');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set (length: ' + process.env.MONGODB_URI.length + ')' : '❌ NOT SET');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '⚠️ NOT SET');
    console.log('CLIENT_URL:', process.env.CLIENT_URL || '⚠️ not set');
    
    // Try multiple possible variable names
    const MONGO_URI = process.env.MONGODB_URI 
      || process.env.MONGO_URI 
      || process.env.DATABASE_URL;
    
    if (!MONGO_URI) {
      console.error('\n❌ ========================================');
      console.error('❌ CRITICAL ERROR: MongoDB URI Not Found!');
      console.error('❌ ========================================');
      console.error('Please create a .env file in the backend folder with:');
      console.error('\nMONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
      console.error('JWT_SECRET=your_jwt_secret_here');
      console.error('\nOr set environment variables in Railway/Render dashboard.');
      console.error('❌ ========================================\n');
      throw new Error('MongoDB URI is not defined!');
    }
    
    console.log('\n🔗 Connecting to MongoDB...');
    console.log('📍 URI Host:', MONGO_URI.substring(0, 30) + '...');
    
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('\n✅ ========================================');
    console.log('✅ MongoDB Connected Successfully!');
    console.log('✅ ========================================');
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`⚡ Connection State: Connected (readyState: ${conn.connection.readyState})`);
    console.log('✅ ========================================\n');

    // Connection events
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ MongoDB Connection FAILED!');
    console.error('❌ ========================================');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting Steps:');
    console.error('1. Create .env file in backend folder');
    console.error('2. Add: MONGODB_URI=your_connection_string');
    console.error('3. Check MongoDB Atlas Network Access (whitelist 0.0.0.0/0)');
    console.error('4. Verify cluster is active (not paused)');
    console.error('5. Check username and password are correct');
    console.error('6. Make sure database name is in the connection string');
    console.error('❌ ========================================\n');
    process.exit(1);
  }
};

// Start DB connection
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

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', usersRoutes);

// ========================================
// HEALTH CHECK ENDPOINTS
// ========================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🫒 OliveGardens API',
    status: 'running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured ✅' : 'Not configured ⚠️',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  res.json({ 
    status: dbState === 1 ? 'OK' : 'WARNING',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      port: process.env.PORT || 5000,
      uptime: process.uptime() + ' seconds'
    },
    database: {
      status: dbStatus[dbState],
      state: dbState,
      connected: dbState === 1,
      name: mongoose.connection.name || 'Not connected',
      host: mongoose.connection.host || 'Not connected'
    },
    cloudinary: {
      configured: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'
    }
  });
});

// Debug endpoint (ONLY in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/env', (req, res) => {
    res.json({
      hasMongoURI: !!process.env.MONGODB_URI,
      mongoURILength: process.env.MONGODB_URI?.length || 0,
      hasJWT: !!process.env.JWT_SECRET,
      hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
      nodeEnv: process.env.NODE_ENV || 'not set',
      port: process.env.PORT || '5000',
      clientURL: process.env.CLIENT_URL || 'not set'
    });
  });
}

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ERROR HANDLER
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Error caught:', err.message);
  
  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry. This item already exists.'
    });
  }
  
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ========================================');
  console.log('🚀 SERVER STARTED SUCCESSFULLY');
  console.log('🚀 ========================================');
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Debug Info: http://localhost:${PORT}/api/debug/env`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'}`);
  console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Connecting...'}`);
  console.log('🚀 ========================================\n');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error('Try: netstat -ano | findstr :5000');
    console.error('Then: taskkill /PID <PID> /F');
    process.exit(1);
  } else {
    console.error('❌ Server Error:', err);
    process.exit(1);
  }
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
const shutdown = (signal) => {
  console.log(`\n👋 ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
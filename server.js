const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const geoip = require('geoip-lite');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const uploadRoutes = require('./routes/upload');
const categoryRoutes = require('./routes/categoryRoutes');

// ✅ Load environment variables FIRST
dotenv.config();

const app = express();
const server = http.createServer(app);

// ========================================
// SECURITY MIDDLEWARE - CRITICAL
// ========================================

// ✅ 1. Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://res.cloudinary.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ 2. Rate Limiting - Prevent Brute Force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.error(`🚨 Rate limit exceeded - IP: ${req.ip} - Route: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.'
  }
});

// Strict limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 1 hour.'
  }
});

// ✅ 3. Data Sanitization against NoSQL Injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Sanitized NoSQL injection attempt: ${key} from IP: ${req.ip}`);
  }
}));

// ✅ 4. Data Sanitization against XSS
app.use(xss());

// ✅ 5. Prevent HTTP Parameter Pollution
app.use(hpp());

// ✅ 6. Trust Proxy (for Railway/Vercel/Render)
app.set('trust proxy', 1);

// ========================================
// ANALYTICS MODEL
// ========================================
const analyticsSchema = new mongoose.Schema({
  totalVisits: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  pageViews: [{ page: String, count: Number }],
  countries: [{
    country: String,
    countryCode: String,
    count: Number
  }],
  dailyStats: [{
    date: { type: Date, default: Date.now },
    visits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 }
  }],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const Analytics = mongoose.model('Analytics', analyticsSchema);

// ========================================
// SOCKET.IO CONFIGURATION
// ========================================
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        process.env.CLIENT_URL,
        process.env.CLIENT_URL_PRODUCTION,
      ].filter(Boolean);

      if (allowedOrigins.indexOf(origin) !== -1 || 
          (origin && origin.includes('olivegardens-frontend') && origin.includes('vercel.app'))) {
        return callback(null, true);
      }
      
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

let activeVisitors = new Map();
let visitorsData = {
  total: 0,
  pages: {},
  countries: {},
  connections: []
};

const getLocationFromIP = (ip) => {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local',
      countryCode: 'LC',
      city: 'Localhost'
    };
  }

  const geo = geoip.lookup(ip);
  
  if (geo) {
    return {
      country: geo.country,
      countryCode: geo.country,
      city: geo.city || 'Unknown',
      region: geo.region || 'Unknown',
      timezone: geo.timezone || 'Unknown'
    };
  }

  return {
    country: 'Unknown',
    countryCode: 'UN',
    city: 'Unknown'
  };
};

const updateAnalytics = async (page, countryCode, country) => {
  try {
    let analytics = await Analytics.findOne();
    
    if (!analytics) {
      analytics = new Analytics({
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: [],
        countries: [],
        dailyStats: []
      });
    }

    analytics.totalVisits += 1;

    const pageIndex = analytics.pageViews.findIndex(p => p.page === page);
    if (pageIndex > -1) {
      analytics.pageViews[pageIndex].count += 1;
    } else {
      analytics.pageViews.push({ page, count: 1 });
    }

    if (country && countryCode) {
      const countryIndex = analytics.countries.findIndex(c => c.countryCode === countryCode);
      if (countryIndex > -1) {
        analytics.countries[countryIndex].count += 1;
      } else {
        analytics.countries.push({ country, countryCode, count: 1 });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = analytics.dailyStats.find(d => {
      const statDate = new Date(d.date);
      statDate.setHours(0, 0, 0, 0);
      return statDate.getTime() === today.getTime();
    });

    if (todayStats) {
      todayStats.visits += 1;
    } else {
      analytics.dailyStats.push({
        date: today,
        visits: 1,
        uniqueVisitors: 0
      });
    }

    analytics.lastUpdated = new Date();
    await analytics.save();
    
    return analytics;
  } catch (error) {
    console.error('❌ Failed to update analytics:', error.message);
    return null;
  }
};

io.on('connection', (socket) => {
  const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || 
                   socket.handshake.headers['x-real-ip'] ||
                   socket.handshake.address;
  
  const location = getLocationFromIP(clientIP);
  
  console.log('👤 New visitor connected:', socket.id);
  console.log('📍 Location:', location.country, location.city);
  
  activeVisitors.set(socket.id, {
    ip: clientIP,
    location: location,
    connectedAt: new Date().toISOString()
  });
  
  visitorsData.total = activeVisitors.size;
  visitorsData.countries[location.countryCode] = 
    (visitorsData.countries[location.countryCode] || 0) + 1;
  
  io.emit('visitors-update', {
    total: visitorsData.total,
    pages: visitorsData.pages,
    countries: visitorsData.countries
  });
  
  socket.on('page-visit', async (page) => {
    console.log(`📄 Page visit: ${page} by ${socket.id} from ${location.country}`);
    visitorsData.pages[page] = (visitorsData.pages[page] || 0) + 1;
    
    await updateAnalytics(page, location.countryCode, location.country);
    
    io.emit('visitors-update', {
      total: visitorsData.total,
      pages: visitorsData.pages,
      countries: visitorsData.countries
    });
  });
  
  socket.on('disconnect', () => {
    console.log('👋 Visitor disconnected:', socket.id);
    
    const visitor = activeVisitors.get(socket.id);
    if (visitor) {
      const countryCode = visitor.location.countryCode;
      if (visitorsData.countries[countryCode]) {
        visitorsData.countries[countryCode] -= 1;
        if (visitorsData.countries[countryCode] <= 0) {
          delete visitorsData.countries[countryCode];
        }
      }
    }
    
    activeVisitors.delete(socket.id);
    visitorsData.total = activeVisitors.size;
    
    io.emit('visitors-update', {
      total: visitorsData.total,
      pages: visitorsData.pages,
      countries: visitorsData.countries
    });
  });
});

app.set('io', io);

// ========================================
// CORS CONFIGURATION
// ========================================
const corsOptions = {
  origin: function (origin, callback) {
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

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    if (origin.includes('olivegardens-frontend') && origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // ✅ Block in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('🚨 CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }

    // Allow in development
    console.warn('⚠️ CORS origin (dev):', origin);
    callback(null, true);
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

// ========================================
// DATABASE CONNECTION
// ========================================
const connectDB = async () => {
  try {
    console.log('\n🔍 ========================================');
    console.log('🔍 Environment Variables Check');
    console.log('🔍 ========================================');
    console.log('NODE_ENV:', process.env.NODE_ENV || '⚠️ not set');
    console.log('PORT:', process.env.PORT || '⚠️ not set');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ NOT SET');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set (length: ' + process.env.JWT_SECRET.length + ')' : '❌ NOT SET');
    
    // ✅ Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️ WARNING: JWT_SECRET is too short! Minimum 32 characters recommended.');
    }
    
    const MONGO_URI = process.env.MONGODB_URI 
      || process.env.MONGO_URI 
      || process.env.DATABASE_URL;
    
    if (!MONGO_URI) {
      throw new Error('MongoDB URI is not defined!');
    }
    
    console.log('\n🔗 Connecting to MongoDB...');
    
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(MONGO_URI, {
          serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('\n✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log('✅ ========================================\n');

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

  } catch (error) {
    console.error('\n❌ MongoDB Connection FAILED!', error.message);
    process.exit(1);
  }
};

connectDB();

// ========================================
// APPLY RATE LIMITING BEFORE ROUTES
// ========================================
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', strictLimiter);
app.use('/api/auth/forgot-password', strictLimiter);
app.use('/api/', apiLimiter);

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
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);

// ========================================
// ANALYTICS API
// ========================================
app.get('/api/analytics', async (req, res) => {
  try {
    let analytics = await Analytics.findOne();
    
    if (!analytics) {
      analytics = new Analytics();
      await analytics.save();
    }

    res.json({
      totalVisits: analytics.totalVisits,
      pageViews: analytics.pageViews.sort((a, b) => b.count - a.count).slice(0, 10),
      countries: analytics.countries.sort((a, b) => b.count - a.count),
      dailyStats: analytics.dailyStats.slice(-30),
      activeNow: visitorsData.total,
      activeCountries: visitorsData.countries,
      lastUpdated: analytics.lastUpdated
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// ========================================
// HEALTH CHECK
// ========================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🫒 OliveGardens API',
    status: 'running',
    version: '1.0.0',
    security: 'Enhanced 🔐',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  
  res.json({ 
    status: dbState === 1 ? 'OK' : 'WARNING',
    database: dbState === 1 ? 'Connected' : 'Disconnected',
    activeVisitors: visitorsData.total,
    security: {
      helmet: 'enabled',
      rateLimiting: 'enabled',
      sanitization: 'enabled',
      xss: 'enabled'
    }
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
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry'
    });
  }
  
  res.status(err.status || 500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ========================================');
  console.log('🚀 SERVER STARTED - SECURE MODE');
  console.log('🚀 ========================================');
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔐 Security: Enhanced`);
  console.log(`🛡️  Helmet: Enabled`);
  console.log(`⏱️  Rate Limiting: Enabled`);
  console.log(`🧹 Sanitization: Enabled`);
  console.log('🚀 ========================================\n');
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
const shutdown = (signal) => {
  console.log(`\n👋 ${signal} - Shutting down gracefully...`);
  
  io.close(() => console.log('✅ Socket.IO closed'));
  
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Shutdown complete');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('⚠️ Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
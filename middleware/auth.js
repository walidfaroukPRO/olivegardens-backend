const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// ========================================
// SECURITY UTILITIES
// ========================================

// ✅ Token Blacklist (In-Memory - Use Redis in production)
const tokenBlacklist = new Set();

// ✅ Failed Login Attempts Tracker
const loginAttempts = new Map();

// ✅ Clear old login attempts every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > 3600000) { // 1 hour
      loginAttempts.delete(key);
    }
  }
}, 3600000);

// ✅ Check if IP is blocked
const isIPBlocked = (ip) => {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  
  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;
  
  // Block for 1 hour after 10 failed attempts
  if (attempts.count >= 10 && timeSinceLastAttempt < 3600000) {
    return true;
  }
  
  // Reset after 1 hour
  if (timeSinceLastAttempt > 3600000) {
    loginAttempts.delete(ip);
    return false;
  }
  
  return false;
};

// ✅ Record failed login attempt
const recordFailedLogin = (ip) => {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(ip, attempts);
  
  console.warn(`⚠️ Failed login attempt from IP: ${ip} (${attempts.count} attempts)`);
};

// ✅ Reset failed login attempts
const resetFailedLogins = (ip) => {
  loginAttempts.delete(ip);
};

// ✅ Validate JWT Secret exists and is strong
const validateJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('🚨 CRITICAL: JWT_SECRET not defined in environment variables!');
    throw new Error('JWT_SECRET is required for authentication');
  }
  
  if (secret.length < 32) {
    console.warn('⚠️ WARNING: JWT_SECRET is too short. Minimum 32 characters recommended.');
  }
  
  return secret;
};

// ========================================
// AUTHENTICATE TOKEN - Protect Routes
// ========================================
const authenticateToken = async (req, res, next) => {
  try {
    // ✅ Check if IP is blocked
    const clientIP = req.ip || req.connection.remoteAddress;
    if (isIPBlocked(clientIP)) {
      console.error(`🚨 Blocked IP attempted access: ${clientIP}`);
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Access temporarily blocked.',
        blockedUntil: new Date(Date.now() + 3600000).toISOString()
      });
    }

    let token;

    // 1. Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check for token in cookies (if using cookies)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 3. No token found
    if (!token) {
      console.warn('⚠️ No authentication token provided');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized. Please login to access this route.',
        requiresAuth: true
      });
    }

    // 4. Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      console.warn('⚠️ Blacklisted token attempted to access:', token.substring(0, 20) + '...');
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        requiresAuth: true
      });
    }

    // 5. Verify token
    try {
      const jwtSecret = validateJWTSecret();
      const decoded = jwt.verify(token, jwtSecret);
      
      // ✅ Support both 'id' and 'userId' for backward compatibility
      const userId = decoded.id || decoded.userId;
      
      if (!userId) {
        console.error('❌ Token missing user ID');
        return res.status(401).json({
          success: false,
          message: 'Invalid token format',
          requiresAuth: true
        });
      }

      console.log('✅ Token verified for user ID:', userId);

      // 6. Find user and exclude sensitive fields
      const user = await User.findById(userId)
        .select('-password -__v -resetPasswordToken -resetPasswordExpire');
      
      if (!user) {
        console.warn('⚠️ User not found for ID:', userId);
        return res.status(401).json({ 
          success: false,
          message: 'User not found. Please login again.',
          requiresAuth: true
        });
      }

      // 7. Check if user account is active
      if (user.isActive === false) {
        console.warn('⚠️ Inactive user attempted access:', user.email);
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.',
          accountStatus: 'inactive'
        });
      }

      // 8. Check if user is verified (if email verification is enabled)
      if (user.emailVerified === false && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        console.warn('⚠️ Unverified user attempted access:', user.email);
        return res.status(403).json({
          success: false,
          message: 'Please verify your email address to continue.',
          requiresVerification: true
        });
      }

      // 9. Update last active timestamp
      user.lastActive = new Date();
      await user.save({ validateBeforeSave: false });

      // 10. Attach user to request
      req.user = user;
      req.token = token; // Store token for logout functionality
      
      console.log('✅ User authenticated:', user.email, '| Role:', user.role);
      
      next();

    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        console.warn('⚠️ Expired token');
        return res.status(401).json({ 
          success: false,
          message: 'Session expired. Please login again.',
          requiresAuth: true,
          expired: true,
          expiredAt: jwtError.expiredAt
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        console.warn('⚠️ Invalid token:', jwtError.message);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid authentication token. Please login again.',
          requiresAuth: true
        });
      }

      if (jwtError.name === 'NotBeforeError') {
        console.warn('⚠️ Token used before valid date');
        return res.status(401).json({
          success: false,
          message: 'Token not yet valid',
          requiresAuth: true
        });
      }

      // Other JWT errors
      console.error('❌ JWT verification error:', jwtError.message);
      return res.status(401).json({ 
        success: false,
        message: 'Authentication failed. Please login again.',
        requiresAuth: true
      });
    }

  } catch (error) {
    console.error('❌ Auth middleware critical error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error in authentication. Please try again later.'
    });
  }
};

// ========================================
// IS ADMIN - Require Admin Role
// ========================================
const isAdmin = (req, res, next) => {
  try {
    // Check if user exists (should be set by authenticateToken)
    if (!req.user) {
      console.error('❌ isAdmin: No user in request');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        requiresAuth: true
      });
    }

    // Check if user is admin or superadmin
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      console.log('✅ Admin access granted:', req.user.email, '| Role:', req.user.role);
      next();
    } else {
      console.warn('🚨 Unauthorized admin access attempt:', req.user.email, '| Role:', req.user.role, '| IP:', req.ip);
      res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.',
        userRole: req.user.role
      });
    }
  } catch (error) {
    console.error('❌ isAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

// ========================================
// IS SUPER ADMIN - Require Super Admin Role
// ========================================
const isSuperAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        requiresAuth: true
      });
    }

    if (req.user.role === 'superadmin') {
      console.log('✅ Super Admin access granted:', req.user.email);
      next();
    } else {
      console.warn('🚨 Unauthorized super admin access:', req.user.email, '| IP:', req.ip);
      res.status(403).json({ 
        success: false,
        message: 'Access denied. Super Admin privileges required.',
        userRole: req.user.role
      });
    }
  } catch (error) {
    console.error('❌ isSuperAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

// ========================================
// AUTHORIZE - Check Multiple Roles
// ========================================
const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          requiresAuth: true
        });
      }

      if (!roles.includes(req.user.role)) {
        console.warn(`🚨 Unauthorized access: ${req.user.email} | Role: ${req.user.role} | Required: ${roles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(' or ')}`,
          userRole: req.user.role
        });
      }

      console.log(`✅ Role authorization passed: ${req.user.email} | Role: ${req.user.role}`);
      next();
    } catch (error) {
      console.error('❌ Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in authorization'
      });
    }
  };
};

// ========================================
// OPTIONAL USER - Attach user if token exists
// ========================================
const optionalUser = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token && !tokenBlacklist.has(token)) {
      try {
        const jwtSecret = validateJWTSecret();
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.id || decoded.userId;
        req.user = await User.findById(userId).select('-password');
      } catch (error) {
        // Invalid token but continue anyway
        console.log('⚠️ Invalid token in optionalUser middleware');
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// ========================================
// LOGOUT - Blacklist Token
// ========================================
const logout = (req, res) => {
  try {
    const token = req.token; // Set by authenticateToken middleware
    
    if (token) {
      tokenBlacklist.add(token);
      console.log('✅ Token blacklisted on logout:', req.user.email);
      
      // Clear token blacklist after 7 days (adjust based on token expiry)
      setTimeout(() => {
        tokenBlacklist.delete(token);
      }, 7 * 24 * 60 * 60 * 1000);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// ========================================
// SECURITY HELPERS - Export for use in auth routes
// ========================================
const securityHelpers = {
  isIPBlocked,
  recordFailedLogin,
  resetFailedLogins,
  tokenBlacklist,
  validateJWTSecret
};

module.exports = { 
  authenticateToken, 
  isAdmin, 
  isSuperAdmin,
  authorize,
  optionalUser,
  logout,
  securityHelpers,
  // Aliases for backward compatibility
  protect: authenticateToken,
  admin: isAdmin
};
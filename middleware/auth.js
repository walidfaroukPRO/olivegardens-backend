const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// AUTHENTICATE TOKEN - Protect Routes
// ========================================
const authenticateToken = async (req, res, next) => {
  try {
    let token;

    // 1. Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. No token found
    if (!token) {
      console.warn('⚠️ No token provided in request');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized. Please login to access this route.',
        requiresAuth: true
      });
    }

    // 3. Verify token
    try {
      // Check if JWT_SECRET exists
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('❌ JWT_SECRET is not defined in environment variables!');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error. Please contact administrator.'
        });
      }

      // Verify and decode token
      const decoded = jwt.verify(token, jwtSecret);
      
      // ✅ Support both 'id' and 'userId' for backward compatibility
      const userId = decoded.id || decoded.userId;
      
      console.log('✅ Token verified for user ID:', userId);
      console.log('Token payload:', decoded);

      // 4. Find user
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        console.warn('⚠️ User not found for ID:', userId);
        return res.status(401).json({ 
          success: false,
          message: 'User not found. Please login again.',
          requiresAuth: true
        });
      }

      // 5. Check if user is active
      if (user.isActive === false) {
        console.warn('⚠️ User account is deactivated:', user.email);
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.'
        });
      }

      // 6. Attach user to request
      req.user = user;
      console.log('✅ User authenticated:', user.email, '- Role:', user.role);
      
      next();

    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        console.warn('⚠️ Token expired');
        return res.status(401).json({ 
          success: false,
          message: 'Session expired. Please login again.',
          requiresAuth: true,
          expired: true
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        console.warn('⚠️ Invalid token');
        return res.status(401).json({ 
          success: false,
          message: 'Invalid authentication token. Please login again.',
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
    console.error('❌ Auth middleware error:', error);
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
    // Check if user exists (should be set by authenticateToken middleware)
    if (!req.user) {
      console.error('❌ isAdmin middleware: No user found in request');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        requiresAuth: true
      });
    }

    // Check if user is admin or superadmin
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      console.log('✅ Admin access granted:', req.user.email);
      next();
    } else {
      console.warn('⚠️ Admin access denied for user:', req.user.email, '- Role:', req.user.role);
      res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.',
        userRole: req.user.role
      });
    }
  } catch (error) {
    console.error('❌ isAdmin middleware error:', error);
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
      console.warn('⚠️ Super Admin access denied for user:', req.user.email);
      res.status(403).json({ 
        success: false,
        message: 'Access denied. Super Admin privileges required.'
      });
    }
  } catch (error) {
    console.error('❌ isSuperAdmin middleware error:', error);
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
        console.warn(`⚠️ Access denied for user ${req.user.email} - Required roles: ${roles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(' or ')}`,
          userRole: req.user.role
        });
      }

      console.log(`✅ Role authorization passed for ${req.user.email} - Role: ${req.user.role}`);
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
// OPTIONAL USER - Attach user if token exists (doesn't block)
// ========================================
const optionalUser = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = { 
  authenticateToken, 
  isAdmin, 
  isSuperAdmin,
  authorize,
  optionalUser,
  // Aliases for backward compatibility
  protect: authenticateToken,
  admin: isAdmin
};
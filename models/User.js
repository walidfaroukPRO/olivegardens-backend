const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // ========================================
  // COMMON FIELDS
  // ========================================
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ],
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // ✅ Don't return password by default
  },
  
  userType: {
    type: String,
    enum: {
      values: ['individual', 'company'],
      message: '{VALUE} is not a valid user type'
    },
    required: [true, 'User type is required']
  },
  
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'superadmin'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user',
    index: true
  },
  
  // ========================================
  // INDIVIDUAL FIELDS
  // ========================================
  firstName: {
    type: String,
    required: function() { 
      return this.userType === 'individual'; 
    },
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: function() { 
      return this.userType === 'individual'; 
    },
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
      'Please provide a valid phone number'
    ]
  },
  
  // ========================================
  // COMPANY FIELDS
  // ========================================
  companyName: {
    type: String,
    required: function() { 
      return this.userType === 'company'; 
    },
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  companyRegistrationNumber: {
    type: String,
    required: function() { 
      return this.userType === 'company'; 
    },
    trim: true,
    unique: true,
    sparse: true // ✅ Allow null for non-company users
  },
  
  taxId: {
    type: String,
    required: function() { 
      return this.userType === 'company'; 
    },
    trim: true,
    unique: true,
    sparse: true
  },
  
  contactPerson: {
    type: String,
    required: function() { 
      return this.userType === 'company'; 
    },
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  
  // ========================================
  // ADDRESS FIELDS
  // ========================================
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State name cannot exceed 100 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters']
    }
  },
  
  // ========================================
  // SECURITY FIELDS
  // ========================================
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // ✅ Track failed login attempts
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  
  // ✅ Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  // ========================================
  // TRACKING FIELDS
  // ========================================
  lastLogin: Date,
  lastActive: Date,
  
  loginHistory: [{
    timestamp: Date,
    ip: String,
    userAgent: String,
    location: String
  }],
  
  // ========================================
  // TIMESTAMPS
  // ========================================
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// VIRTUAL FIELDS
// ========================================

// Full name for individuals
userSchema.virtual('fullName').get(function() {
  if (this.userType === 'individual' && this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.companyName || 'N/A';
});

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ========================================
// INDEXES FOR PERFORMANCE
// ========================================

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================

// ✅ Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // ✅ Validate password strength
    if (this.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12); // ✅ Increased from 10 to 12 for better security
    this.password = await bcrypt.hash(this.password, salt);
    
    console.log('✅ Password hashed for user:', this.email);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Update 'updatedAt' before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ========================================
// METHODS
// ========================================

// ✅ Compare password (for login)
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Select password field explicitly since it's excluded by default
    const user = await this.constructor.findById(this._id).select('+password');
    
    if (!user || !user.password) {
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, user.password);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// ✅ Generate password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// ✅ Generate email verification token
userSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Set expire time (24 hours)
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  
  return verificationToken;
};

// ✅ Increment failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

// ✅ Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// ✅ Record login
userSchema.methods.recordLogin = function(ip, userAgent, location) {
  this.lastLogin = Date.now();
  this.lastActive = Date.now();
  
  // Keep only last 10 login records
  if (!this.loginHistory) {
    this.loginHistory = [];
  }
  
  this.loginHistory.unshift({
    timestamp: new Date(),
    ip,
    userAgent,
    location
  });
  
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(0, 10);
  }
  
  return this.save({ validateBeforeSave: false });
};

// ========================================
// STATIC METHODS
// ========================================

// ✅ Find user by email (including password for authentication)
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Check if account is locked
  if (user.isLocked) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    throw new Error(`Account is locked. Try again in ${lockTime} minutes.`);
  }
  
  const isPasswordMatch = await user.comparePassword(password);
  
  if (!isPasswordMatch) {
    await user.incLoginAttempts();
    throw new Error('Invalid email or password');
  }
  
  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }
  
  return user;
};

// ========================================
// EXPORT MODEL
// ========================================
module.exports = mongoose.model('User', userSchema);
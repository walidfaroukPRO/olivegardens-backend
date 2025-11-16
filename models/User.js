const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Common Fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    enum: ['individual', 'company'],
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Individual Fields
  firstName: {
    type: String,
    required: function() { return this.userType === 'individual'; }
  },
  lastName: {
    type: String,
    required: function() { return this.userType === 'individual'; }
  },
  phone: {
    type: String,
    required: true
  },
  
  // Company Fields
  companyName: {
    type: String,
    required: function() { return this.userType === 'company'; }
  },
  companyRegistrationNumber: {
    type: String,
    required: function() { return this.userType === 'company'; }
  },
  taxId: {
    type: String,
    required: function() { return this.userType === 'company'; }
  },
  contactPerson: {
    type: String,
    required: function() { return this.userType === 'company'; }
  },
  
  // Common Address Fields
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

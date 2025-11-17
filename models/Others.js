const mongoose = require('mongoose');

// ========================================
// CONTACT/INQUIRY MODEL
// ========================================
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  inquiryType: {
    type: String,
    enum: ['general', 'quotation', 'partnership', 'complaint', 'sales', 'support', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed', 'archived'],
    default: 'new'
  }
}, {
  timestamps: true
});

// Indexes for better performance
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

// ========================================
// SLIDESHOW/HERO MODEL
// ========================================
const slideSchema = new mongoose.Schema({
  title: {
    en: {
      type: String,
      required: [true, 'English title is required'],
      trim: true
    },
    ar: {
      type: String,
      required: [true, 'Arabic title is required'],
      trim: true
    },
    es: {
      type: String,
      trim: true
    }
  },
  subtitle: {
    en: {
      type: String,
      trim: true
    },
    ar: {
      type: String,
      trim: true
    },
    es: {
      type: String,
      trim: true
    }
  },
  image: {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String
    }
  },
  buttonText: {
    en: String,
    ar: String,
    es: String
  },
  buttonLink: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
slideSchema.index({ order: 1, isActive: 1 });

// ========================================
// EXPORTS
// ========================================
// ⚠️ لا تعمل export للـ Gallery - موجود في models/Gallery.js
const Contact = mongoose.model('Contact', contactSchema);
const Slide = mongoose.model('Slide', slideSchema);

module.exports = { 
  Contact, 
  Slide 
};
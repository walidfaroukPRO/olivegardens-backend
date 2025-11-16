const mongoose = require('mongoose');

// Content Management System Model
const contentSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    enum: ['hero', 'about', 'features', 'contact-info', 'footer'],
    unique: true
  },
  
  // Hero Section
  heroSlides: [{
    title: {
      en: String,
      ar: String,
      es: String
    },
    subtitle: {
      en: String,
      ar: String,
      es: String
    },
    image: String,
    buttonText: {
      en: String,
      ar: String,
      es: String
    },
    buttonLink: String,
    order: Number,
    isActive: { type: Boolean, default: true }
  }],
  
  // About Section
  about: {
    title: {
      en: String,
      ar: String,
      es: String
    },
    story: {
      en: String,
      ar: String,
      es: String
    },
    mission: {
      en: String,
      ar: String,
      es: String
    },
    vision: {
      en: String,
      ar: String,
      es: String
    },
    image: String,
    foundedYear: String,
    companyType: {
      en: String,
      ar: String,
      es: String
    }
  },
  
  // Features Section
  features: [{
    title: {
      en: String,
      ar: String,
      es: String
    },
    description: {
      en: String,
      ar: String,
      es: String
    },
    icon: String,
    order: Number
  }],
  
  // Stats Section
  stats: [{
    number: String,
    label: {
      en: String,
      ar: String,
      es: String
    },
    icon: String,
    order: Number
  }],
  
  // Contact Info
  contactInfo: {
    phone: String,
    email: String,
    address: {
      en: String,
      ar: String,
      es: String
    },
    workingHours: {
      en: String,
      ar: String,
      es: String
    },
    social: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String
    }
  },
  
  // Company Info
  companyInfo: {
    name: {
      en: String,
      ar: String,
      es: String
    },
    shortDescription: {
      en: String,
      ar: String,
      es: String
    },
    logo: String
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

contentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Content', contentSchema);

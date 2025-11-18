const mongoose = require('mongoose');

// Hero Slide Schema
const heroSlideSchema = new mongoose.Schema({
  title: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  subtitle: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  buttonText: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  buttonLink: { type: String, default: '' },
  image: { type: String, default: '' },
  publicId: { type: String, default: '' }, // Cloudinary public_id
  order: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
});

// About Schema
const aboutSchema = new mongoose.Schema({
  title: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  story: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  mission: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  vision: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  foundedYear: { type: String, default: '1980' },
  companyType: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  image: { type: String, default: '' },
  publicId: { type: String, default: '' }
});

// Stats Schema
const statSchema = new mongoose.Schema({
  number: { type: String, default: '' },
  label: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  icon: { type: String, default: '' },
  order: { type: Number, default: 1 }
});

// Features Schema
const featureSchema = new mongoose.Schema({
  title: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  description: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  icon: { type: String, default: '' },
  order: { type: Number, default: 1 }
});

// Contact Info Schema
const contactInfoSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  workingHours: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  social: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  }
});

// Company Info Schema
const companyInfoSchema = new mongoose.Schema({
  name: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  shortDescription: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  logo: { type: String, default: '' },
  logoPublicId: { type: String, default: '' }
});

// Main Content Schema
const contentSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    enum: ['hero', 'about', 'features', 'contact-info', 'footer'],
    unique: true
  },
  
  // Hero Section
  heroSlides: [heroSlideSchema],
  
  // About Section
  about: aboutSchema,
  
  // Features Section
  features: [featureSchema],
  
  // Stats Section
  stats: [statSchema],
  
  // Contact Info
  contactInfo: contactInfoSchema,
  
  // Company Info
  companyInfo: companyInfoSchema,
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Pre-save middleware
contentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Content', contentSchema);
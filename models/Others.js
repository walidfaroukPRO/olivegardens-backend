const mongoose = require('mongoose');

// Gallery Model
const gallerySchema = new mongoose.Schema({
  title: {
    en: String,
    ar: String
  },
  description: {
    en: String,
    ar: String
  },
  image: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['factory', 'products', 'certifications', 'events', 'other'],
    default: 'other'
  },
  order: {
    type: Number,
    default: 0
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

// Contact/Inquiry Model
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  company: String,
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  inquiryType: {
    type: String,
    enum: ['general', 'quotation', 'partnership', 'complaint', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Slideshow/Hero Model
const slideSchema = new mongoose.Schema({
  title: {
    en: {
      type: String,
      required: true
    },
    ar: {
      type: String,
      required: true
    }
  },
  subtitle: {
    en: String,
    ar: String
  },
  image: {
    type: String,
    required: true
  },
  buttonText: {
    en: String,
    ar: String
  },
  buttonLink: String,
  order: {
    type: Number,
    default: 0
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

const Gallery = mongoose.model('Gallery', gallerySchema);
const Contact = mongoose.model('Contact', contactSchema);
const Slide = mongoose.model('Slide', slideSchema);

module.exports = { Gallery, Contact, Slide };

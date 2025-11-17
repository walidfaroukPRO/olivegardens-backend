const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
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
  imageUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Gallery', gallerySchema);
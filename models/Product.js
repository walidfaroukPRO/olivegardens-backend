const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: true
    },
    ar: {
      type: String,
      required: true
    }
  },
  description: {
    en: {
      type: String,
      required: true
    },
    ar: {
      type: String,
      required: true
    }
  },
  category: {
    type: String,
    enum: ['pickled-olives', 'olive-oil', 'olive-paste', 'stuffed-olives', 'other'],
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  specifications: {
    weight: String,
    packaging: {
      en: String,
      ar: String
    },
    origin: {
      en: String,
      ar: String
    },
    shelfLife: String
  },
  features: [{
    en: String,
    ar: String
  }],
  certifications: [{
    name: String,
    image: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  label: {
    en: { 
      type: String, 
      required: [true, 'English label is required'],
      trim: true 
    },
    ar: { 
      type: String, 
      required: [true, 'Arabic label is required'],
      trim: true 
    },
    es: { 
      type: String, 
      required: [true, 'Spanish label is required'],
      trim: true 
    }
  },
  value: { 
    type: String, 
    required: [true, 'Value is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  image: { 
    type: String, 
    default: '' 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Indexes
categorySchema.index({ value: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ order: 1 });

// Remove old slug field if exists
categorySchema.pre('save', function(next) {
  if (this.slug !== undefined) {
    this.slug = undefined;
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
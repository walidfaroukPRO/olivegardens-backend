const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: [true, 'English name is required'],
      trim: true
    },
    ar: {
      type: String,
      required: [true, 'Arabic name is required'],
      trim: true
    },
    es: {
      type: String,
      trim: true
    }
  },
  description: {
    en: {
      type: String,
      required: [true, 'English description is required']
    },
    ar: {
      type: String,
      required: [true, 'Arabic description is required']
    },
    es: {
      type: String
    }
  },
  // ✅ Changed: Dynamic category (no enum)
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    lowercase: true
  },
  // Cloudinary URLs with public IDs
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  specifications: {
    weight: {
      type: String,
      trim: true
    },
    packaging: {
      en: String,
      ar: String,
      es: String
    },
    origin: {
      en: String,
      ar: String,
      es: String
    },
    shelfLife: {
      type: String,
      trim: true
    }
  },
  features: [{
    en: String,
    ar: String,
    es: String
  }],
  certifications: [{
    name: {
      type: String,
      trim: true
    },
    image: {
      url: String,
      publicId: String
    }
  }],
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  // ✅ Changed: Optional createdBy
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ featured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for main image (first image)
productSchema.virtual('mainImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0].url : null;
});

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// ✅ Validation: Check if category exists in Categories collection
productSchema.pre('save', async function(next) {
  if (this.isModified('category')) {
    try {
      const Category = mongoose.model('Category');
      const categoryExists = await Category.findOne({ 
        value: this.category,
        isActive: true 
      });
      
      if (!categoryExists) {
        throw new Error(`Category '${this.category}' does not exist or is inactive`);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
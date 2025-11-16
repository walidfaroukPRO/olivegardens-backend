const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Gallery upload directory created');
}

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Simple in-memory storage (replace with MongoDB later)
let galleryItems = [];

// @route   GET /api/gallery
// @desc    Get all gallery images
// @access  Public
router.get('/', async (req, res) => {
  try {
    res.json(galleryItems);
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch gallery', 
      error: error.message 
    });
  }
});

// @route   POST /api/gallery
// @desc    Upload gallery images (Admin only)
// @access  Private/Admin
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    console.log('📸 Upload request received');
    console.log('Files:', req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No images uploaded' 
      });
    }

    const newItems = [];

    for (const file of req.files) {
      const galleryItem = {
        _id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: { en: '', ar: '', es: '' },
        description: { en: '', ar: '', es: '' },
        imageUrl: `/uploads/gallery/${file.filename}`,
        category: 'general',
        order: 0,
        isActive: true,
        createdAt: new Date()
      };
      
      galleryItems.push(galleryItem);
      newItems.push(galleryItem);
      console.log('✅ Added:', file.filename);
    }
    
    console.log(`✅ Successfully uploaded ${newItems.length} image(s)`);
    
    res.status(201).json({
      success: true,
      message: `${newItems.length} image(s) uploaded successfully`,
      items: newItems
    });
  } catch (error) {
    console.error('❌ Gallery upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload images', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/gallery/:id
// @desc    Delete gallery image (Admin only)
// @access  Private/Admin
router.delete('/:id', async (req, res) => {
  try {
    const index = galleryItems.findIndex(item => item._id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }

    // Get file path
    const item = galleryItems[index];
    const filename = path.basename(item.imageUrl);
    const filePath = path.join(uploadDir, filename);
    
    // Delete file from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted file:', filename);
    }

    // Remove from array
    galleryItems.splice(index, 1);
    
    res.json({ 
      success: true,
      message: 'Gallery item deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete gallery error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete gallery item', 
      error: error.message 
    });
  }
});

module.exports = router;
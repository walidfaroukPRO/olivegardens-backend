const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect, admin } = require('../middleware/auth');

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'olivegardens/categories', // Folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'limit' }, // Max dimensions
      { quality: 'auto:good' } // Auto quality optimization
    ]
  }
});

// ✅ Multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ✅ Route: Upload single category image
router.post('/category-image', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Cloudinary automatically uploads via multer-storage-cloudinary
    const imageUrl = req.file.path; // Cloudinary URL
    const publicId = req.file.filename; // Cloudinary public_id

    console.log('✅ Category image uploaded:', {
      url: imageUrl,
      publicId: publicId
    });

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: imageUrl,
      publicId: publicId
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
});

// ✅ Route: Delete category image from Cloudinary
router.delete('/category-image/:publicId', protect, admin, async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    console.log('🗑️ Category image deleted:', result);
    
    res.status(200).json({
      message: 'Image deleted successfully',
      result: result
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      message: 'Failed to delete image',
      error: error.message 
    });
  }
});

// ✅ Route: Upload multiple category images (if needed)
router.post('/category-images', protect, admin, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const uploadedImages = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));

    console.log('✅ Multiple category images uploaded:', uploadedImages.length);

    res.status(200).json({
      message: 'Images uploaded successfully',
      images: uploadedImages
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload images',
      error: error.message 
    });
  }
});

module.exports = router;
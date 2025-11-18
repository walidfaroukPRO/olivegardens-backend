const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload to Cloudinary
router.post('/', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Upload to Cloudinary using stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'olivegardens',
          resource_type: 'auto',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(req.file.buffer);
    });

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload image', 
      error: error.message 
    });
  }
});

// Delete from Cloudinary (optional)
router.delete('/:publicId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
});

module.exports = router;
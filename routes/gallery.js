const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { upload, cloudinary } = require('../config/cloudinary');
const { authenticateToken, isAdmin } = require('./auth');

// @route   GET /api/gallery
// @desc    Get all gallery images
// @access  Public
router.get('/', async (req, res) => {
  try {
    const galleryItems = await Gallery.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
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
// @desc    Upload gallery images (Admin only) - With Cloudinary
// @access  Private/Admin
router.post('/', authenticateToken, isAdmin, upload.array('images', 10), async (req, res) => {
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
      const galleryItem = new Gallery({
        title: { en: '', ar: '', es: '' },
        description: { en: '', ar: '', es: '' },
        imageUrl: file.path, // Cloudinary URL
        publicId: file.filename, // Cloudinary public ID
        category: 'general',
        order: 0,
        isActive: true,
        uploadedBy: req.user.userId
      });
      
      await galleryItem.save();
      newItems.push(galleryItem);
      console.log('✅ Uploaded to Cloudinary:', file.filename);
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

// @route   PUT /api/gallery/:id
// @desc    Update gallery image info
// @access  Private/Admin
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, category, order, isActive } = req.body;
    
    const galleryItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      { title, description, category, order, isActive },
      { new: true, runValidators: true }
    );
    
    if (!galleryItem) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Gallery item updated successfully',
      item: galleryItem
    });
  } catch (error) {
    console.error('❌ Update gallery error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update gallery item', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/gallery/:id
// @desc    Delete gallery image (Admin only) - Delete from Cloudinary
// @access  Private/Admin
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);
    
    if (!galleryItem) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }

    // Delete from Cloudinary
    if (galleryItem.publicId) {
      try {
        await cloudinary.uploader.destroy(galleryItem.publicId);
        console.log('🗑️ Deleted from Cloudinary:', galleryItem.publicId);
      } catch (cloudinaryError) {
        console.error('⚠️ Cloudinary deletion error:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Remove from database
    await galleryItem.deleteOne();
    
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
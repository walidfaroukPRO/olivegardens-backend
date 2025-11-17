const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateToken, isAdmin } = require('./auth'); // ✅ Fixed
const { upload, cloudinary } = require('../config/cloudinary');

// Get All Products (Public)
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = { isActive: true };
    
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
});

// Get Single Product (Public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch product', error: error.message });
  }
});

// Create Product (Admin Only) - With Cloudinary
router.post('/', authenticateToken, isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    console.log('📦 Create product request');
    console.log('Files:', req.files?.length || 0);
    console.log('Body:', Object.keys(req.body));
    
    const productData = JSON.parse(req.body.productData);
    
    // Add uploaded images from Cloudinary
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => ({
        url: file.path, // Cloudinary URL
        publicId: file.filename // Cloudinary public_id
      }));
      console.log('📸 Uploaded', productData.images.length, 'images to Cloudinary');
    }
    
    // ✅ Use userId from token (from auth.js)
    productData.createdBy = req.user.userId;
    
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Product created:', product._id);
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
});

// Update Product (Admin Only) - With Cloudinary
router.put('/:id', authenticateToken, isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    console.log('🔄 Update product:', req.params.id);
    console.log('Files:', req.files?.length || 0);
    
    const productData = JSON.parse(req.body.productData);
    
    // Add new uploaded images from Cloudinary if any
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: file.path,
        publicId: file.filename
      }));
      productData.images = [...(productData.images || []), ...newImages];
      console.log('📸 Added', req.files.length, 'new images');
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('✅ Product updated');
    
    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
});

// Delete Product (Admin Only) - Delete from Cloudinary
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.publicId) {
          try {
            await cloudinary.uploader.destroy(image.publicId);
            console.log('🗑️ Deleted from Cloudinary:', image.publicId);
          } catch (cloudinaryError) {
            console.error('⚠️ Cloudinary deletion error:', cloudinaryError);
          }
        }
      }
    }
    
    await product.deleteOne();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
});

// Toggle Product Active Status (Admin Only)
router.patch('/:id/toggle-active', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    product.isActive = !product.isActive;
    await product.save();
    
    res.json({
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle product status', error: error.message });
  }
});

// Toggle Featured Status (Admin Only)
router.patch('/:id/toggle-featured', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    product.featured = !product.featured;
    await product.save();
    
    res.json({
      message: `Product ${product.featured ? 'marked as featured' : 'unmarked from featured'}`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle featured status', error: error.message });
  }
});

module.exports = router;
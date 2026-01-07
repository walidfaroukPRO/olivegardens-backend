const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ========================================
// GET ALL CATEGORIES (Public)
// ========================================
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    
    console.log('📤 Sending categories:', categories.length, 'items');
    console.log('📤 First category:', categories[0]);
    
    // ✅ Return consistent format
    res.json({
      success: true,
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// GET SINGLE CATEGORY (Public)
// ========================================
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('❌ Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// CREATE CATEGORY (Admin Only)
// ========================================
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { label, value, image, order, isActive } = req.body;
    
    // ✅ Validation
    if (!label || !label.en || !label.ar || !label.es) {
      return res.status(400).json({
        success: false,
        message: 'Category label in all languages (en, ar, es) is required'
      });
    }
    
    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'Category value is required'
      });
    }
    
    // ✅ Check for duplicate value
    const existingCategory = await Category.findOne({ value: value.toLowerCase() });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category with value "${value}" already exists`
      });
    }
    
    // ✅ Create category
    const category = await Category.create({
      label,
      value: value.toLowerCase(),
      image: image || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });
    
    console.log('✅ Category created:', category.label.en, '→', category.value);
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
    
  } catch (error) {
    console.error('❌ Create category error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// UPDATE CATEGORY (Admin Only)
// ========================================
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { label, value, image, order, isActive } = req.body;
    
    // Find category
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // ✅ Check for duplicate value (if changing)
    if (value && value !== category.value) {
      const existingCategory = await Category.findOne({ 
        value: value.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: `Category with value "${value}" already exists`
        });
      }
    }
    
    // Update fields
    if (label) category.label = label;
    if (value) category.value = value.toLowerCase();
    if (image !== undefined) category.image = image;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;
    
    await category.save();
    
    console.log('✅ Category updated:', category.label.en, '→', category.value);
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
    
  } catch (error) {
    console.error('❌ Update category error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// DELETE CATEGORY (Admin Only)
// ========================================
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // ✅ Check if category is used by products
    const Product = require('../models/Product');
    const productsCount = await Product.countDocuments({ category: category.value });
    
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is used by ${productsCount} product(s)`,
        productsCount
      });
    }
    
    await category.deleteOne();
    
    console.log('✅ Category deleted:', category.label.en);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete category error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// TOGGLE CATEGORY ACTIVE STATUS (Admin Only)
// ========================================
router.patch('/:id/toggle-active', authenticateToken, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    console.log('✅ Category toggled:', category.label.en, '→', category.isActive);
    
    res.json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'}`,
      category
    });
    
  } catch (error) {
    console.error('❌ Toggle category error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to toggle category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
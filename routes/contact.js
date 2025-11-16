const express = require('express');
const router = express.Router();
const { Contact } = require('../models/Others');
const { authenticateToken, isAdmin } = require('./auth');

// Submit Contact Form (Public)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, subject, message, inquiryType } = req.body;
    
    const contact = new Contact({
      name,
      email,
      phone,
      company,
      subject,
      message,
      inquiryType: inquiryType || 'general'
    });
    
    await contact.save();
    
    res.status(201).json({
      message: 'Your message has been sent successfully. We will contact you soon.',
      contact
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// Get All Contact Messages (Admin Only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status) query.status = status;
    
    const messages = await Contact.find(query).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

// Update Message Status (Admin Only)
router.patch('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json({
      message: 'Status updated successfully',
      contact
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
});

// Delete Message (Admin Only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
});

module.exports = router;

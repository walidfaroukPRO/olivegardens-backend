const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
    es: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
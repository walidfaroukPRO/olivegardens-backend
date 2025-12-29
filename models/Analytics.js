const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  totalVisits: {
    type: Number,
    default: 0
  },
  uniqueVisitors: {
    type: Number,
    default: 0
  },
  pageViews: [{
    page: String,
    count: Number
  }],
  dailyStats: [{
    date: {
      type: Date,
      default: Date.now
    },
    visits: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
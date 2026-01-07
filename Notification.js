/**
 * Notification Model
 * Represents a notification for a user
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['transaction', 'mining', 'trading', 'security', 'system', 'alert'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  sentVia: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Static method to get unread notifications for a user
notificationSchema.statics.getUnreadNotifications = function(userId, limit = 20) {
  return this.find({
    user: userId,
    read: false
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .exec();
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = function(userId, notificationIds) {
  return this.updateMany(
    {
      user: userId,
      _id: { $in: notificationIds }
    },
    {
      read: true,
      readAt: new Date()
    }
  );
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      user: userId,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
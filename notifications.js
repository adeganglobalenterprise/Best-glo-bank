/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

router.get('/', protect, async (req, res) => {
  try {
    const { unread_only = false, limit = 50 } = req.query;

    const query = { user: req.user._id };
    if (unread_only === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false
    });

    res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
        total: notifications.length
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATIONS_FETCH_FAILED',
        message: 'Failed to fetch notifications'
      }
    });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_UPDATE_FAILED',
        message: 'Failed to mark notification as read'
      }
    });
  }
});

module.exports = router;
/**
 * Admin Routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalTransactions = await Transaction.countDocuments();
    const systemVolume = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const activeSessions = totalUsers; // Simplified - in production, use session store

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTransactions,
        systemVolume: systemVolume[0]?.total || 0,
        activeSessions,
        systemStatus: 'healthy'
      }
    });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_STATS_FAILED',
        message: 'Failed to fetch system statistics'
      }
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, role } = req.query;

    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password -apiKeys')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_USERS_FAILED',
        message: 'Failed to fetch users'
      }
    });
  }
});

// @route   PUT /api/admin/users/:userId/status
// @desc    Update user status
// @access  Private (Admin only)
router.put('/users/:userId/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid status'
        }
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    await AuditLog.createLog({
      user: req.user._id,
      action: 'admin_action',
      entityType: 'user',
      entityId: user._id,
      description: `Admin ${req.user.username} updated user ${user.username} status to ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`Admin ${req.user.username} updated user ${user.username} status to ${status}`);

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: {
        userId: user._id,
        status: user.status
      }
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_STATUS_UPDATE_FAILED',
        message: 'Failed to update user status'
      }
    });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs
// @access  Private (Admin only)
router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, user } = req.query;

    const query = {};
    if (action) query.action = action;
    if (user) query.user = user;

    const logs = await AuditLog.find(query)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUDIT_LOGS_FAILED',
        message: 'Failed to fetch audit logs'
      }
    });
  }
});

module.exports = router;
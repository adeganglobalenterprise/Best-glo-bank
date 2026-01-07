/**
 * User Management Routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { logger } = require('../middleware/logger');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        settings: user.settings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch profile'
      }
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, validate(schemas.updateProfile), async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, sex, country, phone } = req.body;

    const user = await User.findById(req.user._id);

    // Update profile fields
    if (firstName) user.profile.firstName = firstName;
    if (lastName) user.profile.lastName = lastName;
    if (dateOfBirth) user.profile.dateOfBirth = dateOfBirth;
    if (sex) user.profile.sex = sex;
    if (country) user.profile.country = country;
    if (phone) user.profile.phone = phone;

    await user.save();

    // Log the update
    await AuditLog.createLog({
      user: user._id,
      action: 'profile_update',
      description: 'User profile updated',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} updated profile`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: user.profile
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Failed to update profile'
      }
    });
  }
});

// @route   PUT /api/users/settings
// @desc    Update user notification settings
// @access  Private
router.put('/settings', protect, validate(schemas.updateSettings), async (req, res) => {
  try {
    const { smsAlerts, emailAlerts, miningAlerts, tradingAlerts } = req.body;

    const user = await User.findById(req.user._id);

    // Update settings
    if (typeof smsAlerts !== 'undefined') user.settings.smsAlerts = smsAlerts;
    if (typeof emailAlerts !== 'undefined') user.settings.emailAlerts = emailAlerts;
    if (typeof miningAlerts !== 'undefined') user.settings.miningAlerts = miningAlerts;
    if (typeof tradingAlerts !== 'undefined') user.settings.tradingAlerts = tradingAlerts;

    await user.save();

    // Log the update
    await AuditLog.createLog({
      user: user._id,
      action: 'settings_update',
      description: 'User notification settings updated',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} updated settings`);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: user.settings
      }
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_UPDATE_FAILED',
        message: 'Failed to update settings'
      }
    });
  }
});

// @route   POST /api/users/api-keys
// @desc    Generate API key
// @access  Private
router.post('/api-keys', protect, validate(schemas.createApiKey), async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user._id);

    // Generate API key
    const apiKey = user.generateApiKey(name);
    await user.save();

    // Log the creation
    await AuditLog.createLog({
      user: user._id,
      action: 'api_key_create',
      description: `API key created: ${name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} created API key: ${name}`);

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        apiKey,
        name
      }
    });
  } catch (error) {
    logger.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEY_CREATE_FAILED',
        message: 'Failed to create API key'
      }
    });
  }
});

// @route   GET /api/users/api-keys
// @desc    Get all API keys
// @access  Private
router.get('/api-keys', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Return API keys without the actual key value (for security)
    const apiKeys = user.apiKeys.map(key => ({
      name: key.name,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      // Show partial key for identification
      partialKey: key.key.substring(0, 8) + '...' + key.key.substring(key.key.length - 4)
    }));

    res.status(200).json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    logger.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEYS_FETCH_FAILED',
        message: 'Failed to fetch API keys'
      }
    });
  }
});

// @route   DELETE /api/users/api-keys/:name
// @desc    Delete API key
// @access  Private
router.delete('/api-keys/:name', protect, async (req, res) => {
  try {
    const { name } = req.params;

    const user = await User.findById(req.user._id);

    // Find and deactivate the API key
    const apiKeyIndex = user.apiKeys.findIndex(key => key.name === name);
    
    if (apiKeyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    user.apiKeys[apiKeyIndex].isActive = false;
    await user.save();

    // Log the deletion
    await AuditLog.createLog({
      user: user._id,
      action: 'api_key_delete',
      description: `API key deleted: ${name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} deleted API key: ${name}`);

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    logger.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEY_DELETE_FAILED',
        message: 'Failed to delete API key'
      }
    });
  }
});

module.exports = router;
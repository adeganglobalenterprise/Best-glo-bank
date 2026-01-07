/**
 * Mining Routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Mining = require('../models/Mining');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { logger } = require('../middleware/logger');

// @route   GET /api/mining/status
// @desc    Get mining status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const activeMining = await Mining.getUserActiveMining(req.user._id);
    
    // Get total mined statistics
    const completedMining = await Mining.getUserCompletedMining(req.user._id, 100);
    
    const totalMined = {
      currency: {},
      crypto: {}
    };
    
    completedMining.forEach(mining => {
      if (mining.type === 'currency') {
        totalMined.currency[mining.currency] = (totalMined.currency[mining.currency] || 0) + mining.minedAmount;
      } else {
        totalMined.crypto[mining.currency] = (totalMined.crypto[mining.currency] || 0) + mining.minedAmount;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        activeMining,
        totalMined,
        addressesGenerated: completedMining.reduce((total, m) => total + (m.addresses?.length || 0), 0)
      }
    });
  } catch (error) {
    logger.error('Get mining status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MINING_STATUS_FAILED',
        message: 'Failed to fetch mining status'
      }
    });
  }
});

// @route   POST /api/mining/toggle
// @desc    Toggle mining on/off
// @access  Private
router.post('/toggle', protect, validate(schemas.toggleMining), async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user._id);

    if (enabled) {
      // Check if mining is already active
      const existingMining = await Mining.getUserActiveMining(req.user._id);
      
      if (existingMining.length === 0) {
        // Start mining for all currencies
        const currencies = ['USD', 'EUR', 'GBP', 'CNY', 'NGN'];
        const cryptos = ['BTC', 'TRX', 'TON', 'ETH'];

        for (const currency of currencies) {
          await Mining.createMiningOperation(req.user._id, currency, 'currency', 1000);
        }

        for (const crypto of cryptos) {
          await Mining.createMiningOperation(req.user._id, crypto, 'crypto', crypto === 'BTC' ? 1 : 100);
        }

        await AuditLog.createLog({
          user: user._id,
          action: 'mining_start',
          description: 'Mining operations started',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        logger.info(`User ${user.username} started mining`);
      }
    } else {
      // Stop all active mining
      await Mining.updateMany(
        { user: req.user._id, status: 'mining' },
        { status: 'cancelled', endTime: new Date() }
      );

      await AuditLog.createLog({
        user: user._id,
        action: 'mining_complete',
        description: 'Mining operations stopped',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`User ${user.username} stopped mining`);
    }

    res.status(200).json({
      success: true,
      message: enabled ? 'Mining activated successfully' : 'Mining deactivated successfully'
    });
  } catch (error) {
    logger.error('Toggle mining error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MINING_TOGGLE_FAILED',
        message: 'Failed to toggle mining'
      }
    });
  }
});

// @route   GET /api/mining/addresses
// @desc    Get generated addresses
// @access  Private
router.get('/addresses', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const completedMining = await Mining.find({
      user: req.user._id,
      status: 'completed'
    })
    .sort({ endTime: -1 })
    .limit(parseInt(limit));

    const addresses = [];
    completedMining.forEach(mining => {
      if (mining.addresses && mining.addresses.length > 0) {
        addresses.push(...mining.addresses.slice(0, 5));
      }
    });

    res.status(200).json({
      success: true,
      data: addresses.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Get mining addresses error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MINING_ADDRESSES_FAILED',
        message: 'Failed to fetch mining addresses'
      }
    });
  }
});

module.exports = router;
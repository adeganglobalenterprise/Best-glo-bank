/**
 * Balance Management Routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// @route   GET /api/balances
// @desc    Get all balances for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user.balances
    });
  } catch (error) {
    logger.error('Get balances error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BALANCE_FETCH_FAILED',
        message: 'Failed to fetch balances'
      }
    });
  }
});

// @route   GET /api/balances/:currency
// @desc    Get specific balance
// @access  Private
router.get('/:currency', protect, async (req, res) => {
  try {
    const { currency } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.balances[currency] && user.balances[currency] !== 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CURRENCY_NOT_SUPPORTED',
          message: 'Currency not supported'
        }
      });
    }

    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CNY: '¥',
      NGN: '₦',
      BTC: '₿',
      TRX: 'TRX',
      TON: 'TON',
      ETH: 'ETH'
    };

    res.status(200).json({
      success: true,
      data: {
        currency,
        balance: user.balances[currency],
        symbol: symbols[currency] || currency
      }
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BALANCE_FETCH_FAILED',
        message: 'Failed to fetch balance'
      }
    });
  }
});

// @route   PUT /api/balances/:currency
// @desc    Update balance (Admin only)
// @access  Private (Admin)
router.put('/:currency', protect, authorize('admin'), async (req, res) => {
  try {
    const { currency } = req.params;
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Invalid amount'
        }
      });
    }

    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        }
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const previousBalance = user.balances[currency] || 0;
    user.balances[currency] = amount;
    await user.save();

    // Log the balance update
    logger.info(`Admin ${req.user.username} updated balance for user ${user.username}: ${currency} ${previousBalance} -> ${amount}`);

    res.status(200).json({
      success: true,
      message: 'Balance updated successfully',
      data: {
        currency,
        previousBalance,
        newBalance: amount
      }
    });
  } catch (error) {
    logger.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BALANCE_UPDATE_FAILED',
        message: 'Failed to update balance'
      }
    });
  }
});

// @route   GET /api/balances/total
// @desc    Get total balance across all currencies converted to USD
// @access  Private
router.get('/total/converted', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Conversion rates (in production, fetch from external API)
    const conversionRates = {
      USD: 1,
      EUR: 1.09,
      GBP: 1.27,
      CNY: 0.14,
      NGN: 0.00065,
      BTC: 45000,
      TRX: 0.10,
      TON: 2.50,
      ETH: 2500
    };

    let totalUSD = 0;
    const breakdown = {};

    Object.keys(user.balances).forEach(currency => {
      const amount = user.balances[currency];
      const usdValue = amount * (conversionRates[currency] || 1);
      totalUSD += usdValue;
      breakdown[currency] = {
        amount,
        usdValue
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalUSD,
        breakdown
      }
    });
  } catch (error) {
    logger.error('Get total balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOTAL_BALANCE_FAILED',
        message: 'Failed to calculate total balance'
      }
    });
  }
});

module.exports = router;
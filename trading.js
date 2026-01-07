/**
 * Trading Routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { logger } = require('../middleware/logger');

// @route   GET /api/trading/status
// @desc    Get trading status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const tradingTransactions = await Transaction.find({
      user: req.user._id,
      type: 'trading'
    });

    const totalTrades = tradingTransactions.length;
    const profitableTrades = tradingTransactions.filter(t => t.amount > 0).length;
    const successRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        robotActive: user.trading.robotActive,
        capital: user.trading.capital,
        profit: user.trading.profit,
        totalTrades,
        successRate: successRate.toFixed(2)
      }
    });
  } catch (error) {
    logger.error('Get trading status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRADING_STATUS_FAILED',
        message: 'Failed to fetch trading status'
      }
    });
  }
});

router.post('/toggle', protect, validate(schemas.toggleTrading), async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user._id);

    user.trading.robotActive = enabled;
    await user.save();

    if (enabled) {
      if (user.trading.capital === 0) {
        user.trading.capital = 10000;
        await user.save();
      }

      await AuditLog.createLog({
        user: user._id,
        action: 'trading_activate',
        description: 'Trading robot activated',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`User ${user.username} activated trading robot`);
    } else {
      await AuditLog.createLog({
        user: user._id,
        action: 'trading_deactivate',
        description: 'Trading robot deactivated',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`User ${user.username} deactivated trading robot`);
    }

    res.status(200).json({
      success: true,
      message: enabled ? 'Trading robot activated' : 'Trading robot deactivated',
      data: {
        robotActive: user.trading.robotActive,
        capital: user.trading.capital,
        profit: user.trading.profit
      }
    });
  } catch (error) {
    logger.error('Toggle trading robot error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRADING_TOGGLE_FAILED',
        message: 'Failed to toggle trading robot'
      }
    });
  }
});

router.post('/withdraw-profit', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.trading.profit <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PROFIT',
          message: 'No profit available to withdraw'
        }
      });
    }

    const profitAmount = user.trading.profit;

    user.balances.USD += profitAmount;
    user.trading.profit = 0;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      type: 'trading',
      currency: 'USD',
      amount: profitAmount,
      description: 'Trading profit withdrawal',
      status: 'completed'
    });

    await Notification.create({
      user: user._id,
      type: 'trading',
      title: 'Profit Withdrawn',
      message: `$${profitAmount.toFixed(2)} trading profit has been transferred to your main balance`,
      data: {
        transactionId: transaction._id,
        amount: profitAmount
      },
      priority: 'high'
    });

    await AuditLog.createLog({
      user: user._id,
      action: 'trading_profit',
      entityType: 'transaction',
      entityId: transaction._id,
      description: `Withdrew $${profitAmount.toFixed(2)} trading profit`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} withdrew $${profitAmount.toFixed(2)} trading profit`);

    res.status(200).json({
      success: true,
      message: 'Profit withdrawn successfully',
      data: {
        withdrawn: profitAmount,
        remainingCapital: user.trading.capital,
        transferredTo: 'main_balance'
      }
    });
  } catch (error) {
    logger.error('Withdraw profit error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFIT_WITHDRAW_FAILED',
        message: 'Failed to withdraw profit'
      }
    });
  }
});

module.exports = router;
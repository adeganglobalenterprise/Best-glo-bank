/**
 * Transaction Routes
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

// @route   POST /api/transactions/send
// @desc    Send money
// @access  Private
router.post('/send', protect, validate(schemas.sendMoney), async (req, res) => {
  try {
    const { currency, amount, recipient, bank, reference } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user has sufficient balance
    if (user.balances[currency] < amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for this transaction'
        }
      });
    }

    // Deduct from user's balance
    user.balances[currency] -= amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'send',
      currency,
      amount,
      recipient: {
        name: recipient,
        account: recipient,
        bank: bank
      },
      reference,
      status: 'completed'
    });

    // Create notification
    await Notification.create({
      user: user._id,
      type: 'transaction',
      title: 'Money Sent',
      message: `You sent ${amount} ${currency} to ${recipient}`,
      data: {
        transactionId: transaction._id,
        currency,
        amount
      },
      priority: 'normal'
    });

    // Log the transaction
    await AuditLog.createLog({
      user: user._id,
      action: 'send_money',
      entityType: 'transaction',
      entityId: transaction._id,
      description: `Sent ${amount} ${currency} to ${recipient}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} sent ${amount} ${currency} to ${recipient}`);

    res.status(200).json({
      success: true,
      message: 'Transaction successful',
      data: {
        transactionId: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        timestamp: transaction.createdAt
      }
    });
  } catch (error) {
    logger.error('Send money error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSACTION_FAILED',
        message: 'Failed to send money'
      }
    });
  }
});

// @route   POST /api/transactions/receive
// @desc    Receive money
// @access  Private
router.post('/receive', protect, validate(schemas.receiveMoney), async (req, res) => {
  try {
    const { currency, amount, sender, reference } = req.body;
    const user = await User.findById(req.user._id);

    // Add to user's balance
    user.balances[currency] += amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'receive',
      currency,
      amount,
      sender: {
        name: sender,
        account: sender
      },
      reference,
      status: 'completed'
    });

    // Create notification
    await Notification.create({
      user: user._id,
      type: 'transaction',
      title: 'Money Received',
      message: `You received ${amount} ${currency} from ${sender}`,
      data: {
        transactionId: transaction._id,
        currency,
        amount
      },
      priority: 'normal'
    });

    // Log the transaction
    await AuditLog.createLog({
      user: user._id,
      action: 'receive_money',
      entityType: 'transaction',
      entityId: transaction._id,
      description: `Received ${amount} ${currency} from ${sender}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} received ${amount} ${currency} from ${sender}`);

    res.status(200).json({
      success: true,
      message: 'Payment received successfully',
      data: {
        transactionId: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        timestamp: transaction.createdAt
      }
    });
  } catch (error) {
    logger.error('Receive money error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECEIVE_FAILED',
        message: 'Failed to receive money'
      }
    });
  }
});

// @route   POST /api/transactions/transfer
// @desc    Transfer between currencies
// @access  Private
router.post('/transfer', protect, validate(schemas.transfer), async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.body;
    const user = await User.findById(req.user._id);

    if (fromCurrency === toCurrency) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SAME_CURRENCY',
          message: 'Cannot transfer between same currencies'
        }
      });
    }

    // Check if user has sufficient balance
    if (user.balances[fromCurrency] < amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for this transfer'
        }
      });
    }

    // Conversion rates (in production, fetch from external API)
    const conversionRates = {
      'USD-EUR': 0.92,
      'USD-GBP': 0.79,
      'USD-CNY': 7.24,
      'USD-NGN': 1550,
      'EUR-USD': 1.09,
      'GBP-USD': 1.27,
      'CNY-USD': 0.14,
      'NGN-USD': 0.00065
    };

    const key = fromCurrency + '-' + toCurrency;
    const rate = conversionRates[key] || 1;
    const convertedAmount = amount * rate;

    // Deduct from source currency
    user.balances[fromCurrency] -= amount;
    // Add to target currency
    user.balances[toCurrency] += convertedAmount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'transfer',
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount,
      exchangeRate: rate,
      status: 'completed'
    });

    // Create notification
    await Notification.create({
      user: user._id,
      type: 'transaction',
      title: 'Transfer Completed',
      message: `Transferred ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`,
      data: {
        transactionId: transaction._id,
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount
      },
      priority: 'normal'
    });

    // Log the transaction
    await AuditLog.createLog({
      user: user._id,
      action: 'transfer',
      entityType: 'transaction',
      entityId: transaction._id,
      description: `Transferred ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} transferred ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`);

    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data: {
        transactionId: transaction._id,
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount,
        exchangeRate: rate,
        timestamp: transaction.createdAt
      }
    });
  } catch (error) {
    logger.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSFER_FAILED',
        message: 'Failed to transfer'
      }
    });
  }
});

// @route   GET /api/transactions/history
// @desc    Get transaction history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 20, offset = 0, type, status, currency } = req.query;

    const transactions = await Transaction.getUserTransactions(req.user._id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type,
      status,
      currency
    });

    const total = await Transaction.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      data: transactions,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HISTORY_FETCH_FAILED',
        message: 'Failed to fetch transaction history'
      }
    });
  }
});

// @route   POST /api/transactions/international
// @desc    International transfer via SWIFT
// @access  Private
router.post('/international', protect, async (req, res) => {
  try {
    const { currency, amount, swiftCode, iban, bankName, country, recipientName } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user has sufficient balance
    if (user.balances[currency] < amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for this transfer'
        }
      });
    }

    // Deduct from user's balance
    user.balances[currency] -= amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'send',
      currency,
      amount,
      recipient: {
        name: recipientName,
        account: iban
      },
      internationalTransfer: {
        swiftCode,
        iban,
        bankName,
        country
      },
      status: 'processing'
    });

    // Create notification
    await Notification.create({
      user: user._id,
      type: 'transaction',
      title: 'International Transfer Initiated',
      message: `Your international transfer of ${amount} ${currency} to ${recipientName} is being processed`,
      data: {
        transactionId: transaction._id,
        currency,
        amount,
        swiftCode
      },
      priority: 'high'
    });

    // Log the transaction
    await AuditLog.createLog({
      user: user._id,
      action: 'send_money',
      entityType: 'transaction',
      entityId: transaction._id,
      description: `Initiated international transfer: ${amount} ${currency} to ${recipientName} (${swiftCode})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} initiated international transfer: ${amount} ${currency} to ${recipientName}`);

    res.status(200).json({
      success: true,
      message: 'International transfer initiated successfully',
      data: {
        transactionId: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  } catch (error) {
    logger.error('International transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNATIONAL_TRANSFER_FAILED',
        message: 'Failed to initiate international transfer'
      }
    });
  }
});

module.exports = router;
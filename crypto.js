/**
 * Cryptocurrency Routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { logger } = require('../middleware/logger');

// @route   POST /api/crypto/wallet
// @desc    Create new crypto wallet
// @access  Private
router.post('/wallet', protect, validate(schemas.createWallet), async (req, res) => {
  try {
    const { currency, label } = req.body;

    // Check if user already has a wallet for this currency
    const existingWallet = await Wallet.findOne({
      user: req.user._id,
      currency,
      status: 'active'
    });

    if (existingWallet) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WALLET_EXISTS',
          message: `You already have an active ${currency} wallet`
        }
      });
    }

    // Create new wallet
    const wallet = await Wallet.create({
      user: req.user._id,
      currency,
      label,
      isDefault: true
    });

    // Log wallet creation
    await AuditLog.createLog({
      user: req.user._id,
      action: 'create_wallet',
      entityType: 'wallet',
      entityId: wallet._id,
      description: `Created new ${currency} wallet: ${wallet.address}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${req.user.username} created ${currency} wallet: ${wallet.address}`);

    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: {
        walletId: wallet._id,
        address: wallet.address,
        currency: wallet.currency,
        label: wallet.label,
        createdAt: wallet.createdAt
      }
    });
  } catch (error) {
    logger.error('Create wallet error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WALLET_CREATE_FAILED',
        message: 'Failed to create wallet'
      }
    });
  }
});

// @route   GET /api/crypto/wallets
// @desc    Get all wallets
// @access  Private
router.get('/wallets', protect, async (req, res) => {
  try {
    const wallets = await Wallet.find({
      user: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: wallets.map(wallet => ({
        walletId: wallet._id,
        address: wallet.address,
        currency: wallet.currency,
        balance: wallet.balance,
        label: wallet.label,
        isDefault: wallet.isDefault,
        createdAt: wallet.createdAt
      }))
    });
  } catch (error) {
    logger.error('Get wallets error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WALLETS_FETCH_FAILED',
        message: 'Failed to fetch wallets'
      }
    });
  }
});

// @route   POST /api/crypto/send
// @desc    Send crypto
// @access  Private
router.post('/send', protect, validate(schemas.sendCrypto), async (req, res) => {
  try {
    const { currency, amount, recipientAddress } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user has sufficient balance
    if (user.balances[currency] < amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient ${currency} balance`
        }
      });
    }

    // Deduct from user's balance
    user.balances[currency] -= amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'crypto_send',
      currency,
      amount,
      recipient: {
        wallet: recipientAddress
      },
      cryptoDetails: {
        transactionHash: generateTxHash(),
        network: currency.toLowerCase(),
        confirmations: 0
      },
      status: 'completed'
    });

    // Create notification
    await Notification.create({
      user: user._id,
      type: 'transaction',
      title: 'Crypto Sent',
      message: `You sent ${amount} ${currency} to ${recipientAddress.substring(0, 10)}...`,
      data: {
        transactionId: transaction._id,
        currency,
        amount,
        recipientAddress
      },
      priority: 'normal'
    });

    // Log the transaction
    await AuditLog.createLog({
      user: user._id,
      action: 'send_crypto',
      entityType: 'transaction',
      entityId: transaction._id,
      description: `Sent ${amount} ${currency} to ${recipientAddress}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User ${user.username} sent ${amount} ${currency} to ${recipientAddress}`);

    res.status(200).json({
      success: true,
      message: 'Crypto transaction successful',
      data: {
        transactionId: transaction._id,
        amount: transaction.amount,
        currency: transaction.currency,
        txHash: transaction.cryptoDetails.transactionHash,
        timestamp: transaction.createdAt
      }
    });
  } catch (error) {
    logger.error('Send crypto error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CRYPTO_SEND_FAILED',
        message: 'Failed to send crypto'
      }
    });
  }
});

// @route   GET /api/crypto/balance/:currency
// @desc    Get crypto balance with USD value
// @access  Private
router.get('/balance/:currency', protect, async (req, res) => {
  try {
    const { currency } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.balances[currency] && user.balances[currency] !== 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CURRENCY_NOT_SUPPORTED',
          message: 'Cryptocurrency not supported'
        }
      });
    }

    // Crypto prices in USD (in production, fetch from external API)
    const cryptoPrices = {
      BTC: 45000,
      TRX: 0.10,
      TON: 2.50,
      ETH: 2500
    };

    const balance = user.balances[currency];
    const usdValue = balance * (cryptoPrices[currency] || 0);

    res.status(200).json({
      success: true,
      data: {
        currency,
        balance,
        usdValue,
        priceUSD: cryptoPrices[currency] || 0
      }
    });
  } catch (error) {
    logger.error('Get crypto balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CRYPTO_BALANCE_FAILED',
        message: 'Failed to fetch crypto balance'
      }
    });
  }
});

// Helper function to generate transaction hash
function generateTxHash() {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

module.exports = router;
/**
 * Transaction Model
 * Represents a transaction in the banking system
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['send', 'receive', 'transfer', 'crypto_send', 'crypto_receive', 'mining', 'trading'],
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP', 'CNY', 'NGN', 'BTC', 'TRX', 'TON', 'ETH']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fromCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CNY', 'NGN', 'BTC', 'TRX', 'TON', 'ETH']
  },
  toCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CNY', 'NGN', 'BTC', 'TRX', 'TON', 'ETH']
  },
  convertedAmount: {
    type: Number,
    min: 0
  },
  exchangeRate: {
    type: Number
  },
  sender: {
    name: String,
    account: String,
    wallet: String
  },
  recipient: {
    name: String,
    account: String,
    wallet: String,
    bank: {
      type: String,
      enum: ['commercial', 'microfinance', 'palmpay', 'moniepoint', 'opay']
    }
  },
  internationalTransfer: {
    swiftCode: String,
    iban: String,
    bankName: String,
    country: String
  },
  cryptoDetails: {
    transactionHash: String,
    network: String,
    confirmations: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  description: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ createdAt: -1 });

// Generate unique reference before saving
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.reference) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.reference = `TXN-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Static method to get transaction history for a user
transactionSchema.statics.getUserTransactions = function(userId, options = {}) {
  const { limit = 20, offset = 0, type, status, currency } = options;
  
  const query = { user: userId };
  
  if (type) query.type = type;
  if (status) query.status = status;
  if (currency) query.currency = currency;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .exec();
};

// Static method to get transaction statistics
transactionSchema.statics.getTransactionStats = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        status: 'completed',
        ...(startDate && endDate ? {
          createdAt: { $gte: startDate, $lte: endDate }
        } : {})
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
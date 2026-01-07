/**
 * Wallet Model
 * Represents a cryptocurrency wallet
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['BTC', 'TRX', 'TON', 'ETH'],
    index: true
  },
  address: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  privateKey: {
    type: String,
    select: false // Never return private key in queries
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  label: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'frozen'],
    default: 'active'
  },
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
walletSchema.index({ user: 1, currency: 1 });
walletSchema.index({ address: 1 });
walletSchema.index({ currency: 1, status: 1 });

// Generate unique address before saving
walletSchema.pre('save', async function(next) {
  if (this.isNew && !this.address) {
    this.address = this.generateAddress(this.currency);
    
    // Generate private key (in production, use proper crypto libraries)
    if (!this.privateKey) {
      this.privateKey = crypto.randomBytes(64).toString('hex');
    }
  }
  next();
});

// Method to generate blockchain address
walletSchema.methods.generateAddress = function(currency) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let address = '';
  
  const prefixes = {
    BTC: 'bc1',
    TRX: 'T',
    TON: 'UQ',
    ETH: '0x'
  };
  
  address = prefixes[currency] || '0x';
  
  // Generate 40-character address
  for (let i = 0; i < 40; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
};

// Static method to get user's wallets by currency
walletSchema.statics.getUserWalletsByCurrency = function(userId, currency) {
  return this.find({
    user: userId,
    currency: currency,
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Static method to get user's default wallet for currency
walletSchema.statics.getUserDefaultWallet = function(userId, currency) {
  return this.findOne({
    user: userId,
    currency: currency,
    isDefault: true,
    status: 'active'
  });
};

module.exports = mongoose.model('Wallet', walletSchema);
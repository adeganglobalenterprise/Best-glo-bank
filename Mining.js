/**
 * Mining Model
 * Tracks mining operations and generated addresses
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const miningSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP', 'CNY', 'NGN', 'BTC', 'TRX', 'TON', 'ETH'],
    index: true
  },
  type: {
    type: String,
    enum: ['currency', 'crypto'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'mining', 'completed', 'failed'],
    default: 'mining'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  targetAmount: {
    type: Number,
    required: true
  },
  minedAmount: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  nextMiningTime: {
    type: Date
  },
  addresses: [{
    address: String,
    currency: String,
    generatedAt: { type: Date, default: Date.now }
  }],
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
miningSchema.index({ user: 1, currency: 1, status: 1 });
miningSchema.index({ type: 1, status: 1 });
miningSchema.index({ nextMiningTime: 1 });

// Virtual for estimated completion time
miningSchema.virtual('estimatedCompletion').get(function() {
  if (this.status !== 'mining') return null;
  
  const elapsed = Date.now() - this.startTime.getTime();
  const progressPerMs = this.progress / elapsed;
  const remainingProgress = 100 - this.progress;
  const remainingTime = remainingProgress / progressPerMs;
  
  return new Date(Date.now() + remainingTime);
});

// Static method to get active mining operations for a user
miningSchema.statics.getUserActiveMining = function(userId) {
  return this.find({
    user: userId,
    status: 'mining'
  }).sort({ currency: 1 });
};

// Static method to get completed mining operations
miningSchema.statics.getUserCompletedMining = function(userId, limit = 10) {
  return this.find({
    user: userId,
    status: 'completed'
  }).sort({ endTime: -1 }).limit(limit);
};

// Static method to create new mining operation
miningSchema.statics.createMiningOperation = function(userId, currency, type, targetAmount) {
  return this.create({
    user: userId,
    currency,
    type,
    targetAmount,
    status: 'mining',
    progress: 0,
    minedAmount: 0,
    startTime: new Date()
  });
};

module.exports = mongoose.model('Mining', miningSchema);
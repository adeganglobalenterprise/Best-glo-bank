/**
 * AuditLog Model
 * Tracks all system activities for security and compliance
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'send_money',
      'receive_money',
      'transfer',
      'create_wallet',
      'send_crypto',
      'receive_crypto',
      'mining_start',
      'mining_complete',
      'trading_activate',
      'trading_deactivate',
      'trading_profit',
      'api_key_create',
      'api_key_delete',
      'profile_update',
      'settings_update',
      'admin_action',
      'security_alert'
    ],
    index: true
  },
  entityType: {
    type: String,
    enum: ['user', 'transaction', 'wallet', 'mining', 'trading', 'notification', 'apiKey']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  errorMessage: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
auditLogSchema.index({ user: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index - auto-delete logs older than 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to create audit log
auditLogSchema.statics.createLog = function(data) {
  return this.create({
    ...data,
    metadata: new Map(Object.entries(data.metadata || {}))
  });
};

// Static method to get user activity logs
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const { limit = 50, offset = 0, action, startDate, endDate } = options;
  
  const query = { user: userId };
  
  if (action) query.action = action;
  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .exec();
};

// Static method to get security alerts
auditLogSchema.statics.getSecurityAlerts = function(limit = 100) {
  return this.find({
    $or: [
      { action: 'security_alert' },
      { status: 'failure' }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .exec();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
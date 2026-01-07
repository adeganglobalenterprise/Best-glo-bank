/**
 * Trading Service
 * Background service for automated trading
 */

const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { logger } = require('../middleware/logger');

// Start trading service
function startTradingService() {
  logger.info('Starting trading service...');

  // Run every minute to execute trades for active robots
  cron.schedule('* * * * *', async () => {
    try {
      await executeTradingRobots();
    } catch (error) {
      logger.error('Trading robot execution error:', error);
    }
  });

  logger.info('Trading service started successfully');
}

// Execute trading robots
async function executeTradingRobots() {
  const users = await User.find({ 
    'trading.robotActive': true,
    status: 'active'
  });

  for (const user of users) {
    try {
      if (user.trading.capital <= 0) continue;

      // Simulate trading
      const isProfitable = Math.random() > 0.35; // 65% chance of profit
      const tradeAmount = user.trading.capital * (0.01 + Math.random() * 0.05); // 1-5% of capital
      const profit = isProfitable ? tradeAmount * (0.02 + Math.random() * 0.08) : -tradeAmount * 0.02;

      if (isProfitable) {
        // Add to profit
        user.trading.profit += profit;
      } else {
        // Deduct from capital
        user.trading.capital = Math.max(0, user.trading.capital - Math.abs(profit));
      }

      await user.save();

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'trading',
        currency: 'USD',
        amount: Math.abs(profit),
        description: `Auto-trading - ${isProfitable ? 'Profit' : 'Loss'}`,
        metadata: {
          tradeType: isProfitable ? 'profit' : 'loss',
          profit: isProfitable ? profit : null,
          loss: !isProfitable ? Math.abs(profit) : null,
          capital: user.trading.capital
        },
        status: 'completed'
      });

      // Log the trade
      await AuditLog.createLog({
        user: user._id,
        action: 'trading_profit',
        entityType: 'transaction',
        entityId: transaction._id,
        description: `Trading robot executed: ${isProfitable ? 'Profit' : 'Loss'} $${Math.abs(profit).toFixed(2)}`,
        metadata: {
          capital: user.trading.capital,
          profit: user.trading.profit
        }
      });

      logger.info(`Trading robot for user ${user.username}: ${isProfitable ? 'Profit' : 'Loss'} $${Math.abs(profit).toFixed(2)}`);

      // Create notification for significant profits
      if (isProfitable && profit > 50) {
        await Notification.create({
          user: user._id,
          type: 'trading',
          title: 'Trading Profit',
          message: `Your trading robot generated $${profit.toFixed(2)} profit`,
          data: {
            transactionId: transaction._id,
            amount: profit
          },
          priority: 'normal'
        });
      }

    } catch (error) {
      logger.error(`Error executing trading robot for user ${user._id}:`, error);
    }
  }

  logger.info(`Executed trading robots for ${users.length} users`);
}

module.exports = {
  startTradingService,
  executeTradingRobots
};
/**
 * Mining Service
 * Background service for automated mining operations
 */

const cron = require('node-cron');
const User = require('../models/User');
const Mining = require('../models/Mining');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { logger } = require('../middleware/logger');

// Start mining service
function startMiningService() {
  logger.info('Starting mining service...');

  // Run every hour to complete mining cycles
  cron.schedule('0 * * * *', async () => {
    try {
      await processMiningCycles();
    } catch (error) {
      logger.error('Mining cycle error:', error);
    }
  });

  // Update mining progress every minute
  cron.schedule('* * * * *', async () => {
    try {
      await updateMiningProgress();
    } catch (error) {
      logger.error('Mining progress update error:', error);
    }
  });

  // Generate addresses every second
  setInterval(async () => {
    try {
      await generateMiningAddresses();
    } catch (error) {
      logger.error('Address generation error:', error);
    }
  }, 1000);

  logger.info('Mining service started successfully');
}

// Process completed mining cycles
async function processMiningCycles() {
  logger.info('Processing mining cycles...');

  const activeMining = await Mining.find({ status: 'mining' });

  for (const mining of activeMining) {
    try {
      const user = await User.findById(mining.user);
      if (!user || user.status !== 'active') continue;

      // Add mined amount to user's balance
      user.balances[mining.currency] += mining.targetAmount;
      await user.save();

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'mining',
        currency: mining.currency,
        amount: mining.targetAmount,
        description: `Mining reward: ${mining.targetAmount} ${mining.currency}`,
        status: 'completed'
      });

      // Update mining record
      mining.status = 'completed';
      mining.minedAmount = mining.targetAmount;
      mining.progress = 100;
      mining.endTime = new Date();
      mining.nextMiningTime = new Date(Date.now() + 60 * 60 * 1000); // Next hour
      mining.transaction = transaction._id;
      await mining.save();

      // Create notification
      await Notification.create({
        user: user._id,
        type: 'mining',
        title: 'Mining Completed',
        message: `Mining completed! You received ${mining.targetAmount} ${mining.currency}`,
        data: {
          miningId: mining._id,
          currency: mining.currency,
          amount: mining.targetAmount
        },
        priority: 'normal'
      });

      await AuditLog.createLog({
        user: user._id,
        action: 'mining_complete',
        entityType: 'mining',
        entityId: mining._id,
        description: `Mining completed: ${mining.targetAmount} ${mining.currency}`,
        metadata: {
          transactionId: transaction._id
        }
      });

      logger.info(`Mining completed for user ${user.username}: ${mining.targetAmount} ${mining.currency}`);

      // Start new mining cycle
      await Mining.createMiningOperation(user._id, mining.currency, mining.type, mining.targetAmount);

    } catch (error) {
      logger.error(`Error processing mining cycle for user ${mining.user}:`, error);
    }
  }

  logger.info(`Processed ${activeMining.length} mining cycles`);
}

// Update mining progress
async function updateMiningProgress() {
  const activeMining = await Mining.find({ status: 'mining' });

  for (const mining of activeMining) {
    const elapsed = Date.now() - mining.startTime.getTime();
    const totalDuration = 60 * 60 * 1000; // 1 hour
    const progress = Math.min((elapsed / totalDuration) * 100, 100);

    if (progress !== mining.progress) {
      mining.progress = Math.round(progress);
      await mining.save();
    }
  }
}

// Generate mining addresses
async function generateMiningAddresses() {
  const currencies = ['BTC', 'TRX', 'TON', 'ETH'];
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  for (let i = 0; i < 10; i++) {
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const prefixes = { BTC: 'bc1', TRX: 'T', TON: 'UQ', ETH: '0x' };
    
    let address = prefixes[currency];
    for (let j = 0; j < 40; j++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Store in active mining operations
    const activeMining = await Mining.findOne({ 
      currency, 
      status: 'mining' 
    });

    if (activeMining) {
      if (!activeMining.addresses) {
        activeMining.addresses = [];
      }
      
      activeMining.addresses.push({
        address,
        currency,
        generatedAt: new Date()
      });

      // Keep only last 100 addresses
      if (activeMining.addresses.length > 100) {
        activeMining.addresses.shift();
      }

      await activeMining.save();
    }
  }
}

module.exports = {
  startMiningService,
  processMiningCycles,
  updateMiningProgress,
  generateMiningAddresses
};
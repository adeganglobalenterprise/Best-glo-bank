/**
 * Validation Middleware
 * Uses Joi for request validation
 */

const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
    }

    // Replace request body with validated data
    req.body = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
    firstName: Joi.string().max(50),
    lastName: Joi.string().max(50),
    country: Joi.string()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Transaction schemas
  sendMoney: Joi.object({
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CNY', 'NGN').required(),
    amount: Joi.number().positive().required(),
    recipient: Joi.string().required(),
    bank: Joi.string().valid('commercial', 'microfinance', 'palmpay', 'moniepoint', 'opay'),
    reference: Joi.string()
  }),

  receiveMoney: Joi.object({
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CNY', 'NGN').required(),
    amount: Joi.number().positive().required(),
    sender: Joi.string().required(),
    reference: Joi.string()
  }),

  transfer: Joi.object({
    fromCurrency: Joi.string().valid('USD', 'EUR', 'GBP', 'CNY', 'NGN').required(),
    toCurrency: Joi.string().valid('USD', 'EUR', 'GBP', 'CNY', 'NGN').required(),
    amount: Joi.number().positive().required()
  }),

  // Crypto schemas
  createWallet: Joi.object({
    currency: Joi.string().valid('BTC', 'TRX', 'TON', 'ETH').required(),
    label: Joi.string().max(100)
  }),

  sendCrypto: Joi.object({
    currency: Joi.string().valid('BTC', 'TRX', 'TON', 'ETH').required(),
    amount: Joi.number().positive().required(),
    recipientAddress: Joi.string().required()
  }),

  // Mining schemas
  toggleMining: Joi.object({
    enabled: Joi.boolean().required()
  }),

  // Trading schemas
  toggleTrading: Joi.object({
    enabled: Joi.boolean().required()
  }),

  placeTrade: Joi.object({
    pair: Joi.string().required(),
    type: Joi.string().valid('buy', 'sell').required(),
    amount: Joi.number().positive().required()
  }),

  // User schemas
  updateProfile: Joi.object({
    firstName: Joi.string().max(50),
    lastName: Joi.string().max(50),
    dateOfBirth: Joi.date(),
    sex: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say'),
    country: Joi.string(),
    phone: Joi.string()
  }),

  updateSettings: Joi.object({
    smsAlerts: Joi.boolean(),
    emailAlerts: Joi.boolean(),
    miningAlerts: Joi.boolean(),
    tradingAlerts: Joi.boolean()
  }),

  // API key schemas
  createApiKey: Joi.object({
    name: Joi.string().required()
  })
};

module.exports = {
  validate,
  schemas
};
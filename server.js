/**
 * Banking Application - Backend Server
 * Production-ready Node.js/Express server with MongoDB
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const balanceRoutes = require('./routes/balances');
const transactionRoutes = require('./routes/transactions');
const cryptoRoutes = require('./routes/crypto');
const miningRoutes = require('./routes/mining');
const tradingRoutes = require('./routes/trading');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { protect } = require('./middleware/auth');
const { loggingMiddleware } = require('./middleware/logger');

// Import services
const { startMiningService } = require('./services/miningService');
const { startTradingService } = require('./services/tradingService');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: ['currency', 'type', 'status', 'limit', 'offset']
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(loggingMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/balances', protect, balanceRoutes);
app.use('/api/transactions', protect, transactionRoutes);
app.use('/api/crypto', protect, cryptoRoutes);
app.use('/api/mining', protect, miningRoutes);
app.use('/api/trading', protect, tradingRoutes);
app.use('/api/notifications', protect, notificationRoutes);
app.use('/api/admin', protect, adminRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Start background services
    startMiningService();
    startTradingService();
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 Server listening on port ${PORT}`);
  console.log(`🌐 API endpoint: http://localhost:${PORT}/api`);
  
  await connectDB();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close();
  });
});

module.exports = app;
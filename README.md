# 🏦 Banking App Backend - Production-Ready Server

A secure, scalable backend server for the Global Banking & Crypto Application built with Node.js, Express, and MongoDB.

## 🚀 Features

### 🔒 Security
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with configurable rounds
- **Rate Limiting**: Configurable rate limiting for all endpoints
- **Input Validation**: Joi schema validation for all requests
- **XSS Protection**: Sanitization against XSS attacks
- **SQL Injection Prevention**: MongoDB query sanitization
- **Helmet**: Security HTTP headers
- **CORS**: Configurable CORS policies
- **Audit Logging**: Complete audit trail for all actions
- **Two-Factor Authentication**: Optional 2FA support

### 📊 Database
- **MongoDB**: NoSQL database with Mongoose ODM
- **Data Models**: User, Transaction, Wallet, Mining, Notification, AuditLog
- **Indexes**: Optimized database indexes for performance
- **TTL**: Auto-expiration of old logs

### ⚡ Features
- **Multi-Currency Banking**: USD, EUR, GBP, CNY, NGN
- **Cryptocurrency**: BTC, TRX, TON, ETH wallet support
- **Mining System**: Automated mining with background services
- **Trading Robot**: Automated crypto trading
- **Transaction System**: Send, receive, transfer, international transfers
- **Notification System**: Email and SMS alerts (simulated)
- **API Keys**: REST API key management
- **Admin Panel**: Full admin controls and monitoring

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 4.4
- npm >= 9.0.0

### Setup

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file**
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/banking-app
   JWT_SECRET=your-super-secret-jwt-key-change-this-min-32-chars
   # ... other configurations
   ```

5. **Start MongoDB**
   ```bash
   # Linux/Mac
   mongod

   # Windows
   net start MongoDB
   ```

6. **Start the server**
   ```bash
   # Production
   npm start

   # Development with auto-reload
   npm run dev
   ```

## 🏗️ Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── errorHandler.js      # Global error handler
│   ├── notFound.js          # 404 handler
│   ├── logger.js            # Logging middleware
│   └── validation.js        # Request validation
├── models/
│   ├── User.js              # User model
│   ├── Transaction.js       # Transaction model
│   ├── Wallet.js            # Wallet model
│   ├── Mining.js            # Mining model
│   ├── Notification.js      # Notification model
│   └── AuditLog.js          # Audit log model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── balances.js          # Balance management routes
│   ├── transactions.js      # Transaction routes
│   ├── crypto.js            # Cryptocurrency routes
│   ├── mining.js            # Mining routes
│   ├── trading.js           # Trading routes
│   ├── notifications.js     # Notification routes
│   └── admin.js             # Admin routes
├── services/
│   ├── miningService.js     # Background mining service
│   └── tradingService.js    # Background trading service
├── logs/                    # Log files (auto-created)
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── server.js                # Main server file
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/settings` - Update notification settings
- `POST /api/users/api-keys` - Generate API key
- `GET /api/users/api-keys` - Get API keys
- `DELETE /api/users/api-keys/:name` - Delete API key

### Balances
- `GET /api/balances` - Get all balances
- `GET /api/balances/:currency` - Get specific balance
- `PUT /api/balances/:currency` - Update balance (Admin)
- `GET /api/balances/total/converted` - Get total converted to USD

### Transactions
- `POST /api/transactions/send` - Send money
- `POST /api/transactions/receive` - Receive money
- `POST /api/transactions/transfer` - Transfer between currencies
- `GET /api/transactions/history` - Get transaction history
- `POST /api/transactions/international` - International transfer

### Cryptocurrency
- `POST /api/crypto/wallet` - Create wallet
- `GET /api/crypto/wallets` - Get wallets
- `POST /api/crypto/send` - Send crypto
- `GET /api/crypto/balance/:currency` - Get crypto balance

### Mining
- `GET /api/mining/status` - Get mining status
- `POST /api/mining/toggle` - Toggle mining
- `GET /api/mining/addresses` - Get generated addresses

### Trading
- `GET /api/trading/status` - Get trading status
- `POST /api/trading/toggle` - Toggle trading robot
- `POST /api/trading/withdraw-profit` - Withdraw profit

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Admin (Admin only)
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:userId/status` - Update user status
- `GET /api/admin/audit-logs` - Get audit logs

## 🔒 Security Best Practices

### Authentication
- All protected routes require valid JWT token
- Tokens expire after 7 days (configurable)
- Refresh tokens available for extended sessions
- Passwords hashed with bcrypt (12 rounds by default)

### Rate Limiting
- Standard: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Configurable via environment variables

### Validation
- All inputs validated with Joi schemas
- Sanitization against XSS and injection attacks
- Type checking and length limits

### Logging
- Winston logger for structured logging
- Separate error and combined log files
- Log rotation (5 files, 5MB each)
- Audit logs for all user actions

### Database Security
- Mongoose sanitization against NoSQL injection
- Proper indexing for performance
- TTL indexes for automatic cleanup

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Lint code
npm run lint
```

## 📊 Monitoring

### Health Check
```bash
GET /health
```

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`

### Audit Logs
Access via admin API endpoint

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (required)
- `JWT_EXPIRE` - Token expiration (default: 7d)
- `FRONTEND_URL` - CORS allowed origin

### Security Settings
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit (default: 100)
- `AUTH_RATE_LIMIT_MAX_REQUESTS` - Auth rate limit (default: 5)

## 🚀 Deployment

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name banking-app
pm2 startup
pm2 save
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`
3. Configure proper MongoDB connection
4. Set up reverse proxy (nginx)
5. Enable HTTPS with SSL certificate
6. Configure firewall rules
7. Set up monitoring and alerting

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues and questions, please refer to the main project documentation.

---

**⚠️ Security Notice**: This is a demonstration application. For production use, ensure:
- All secrets are properly secured
- Database backups are configured
- Monitoring and alerting are set up
- Security audit is performed
- Compliance requirements are met
- SSL/TLS is properly configured
- Firewall rules are configured
- Regular security updates are applied
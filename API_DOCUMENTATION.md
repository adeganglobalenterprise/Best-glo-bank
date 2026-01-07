# 🏦 Global Banking App - API Documentation

## Overview

This document describes the REST API endpoints available in the Global Banking & Crypto Application. The API allows external applications to interact with the banking system programmatically.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All API requests require authentication using an API key in the header:

```
Authorization: Bearer YOUR_API_KEY
```

### Get API Key
Users can generate API keys from the Profile section in the application.

---

## Endpoints

### 1. User Management

#### Get User Profile
```http
GET /api/user/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "john_doe",
    "name": "John Doe",
    "email": "john@example.com",
    "country": "Nigeria",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

#### Update User Profile
```http
PUT /api/user/profile
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "country": "Nigeria"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

### 2. Balance Management

#### Get All Balances
```http
GET /api/balances
```

**Response:**
```json
{
  "success": true,
  "data": {
    "USD": 5000.00,
    "EUR": 4600.00,
    "GBP": 3950.00,
    "CNY": 36200.00,
    "NGN": 7750000.00,
    "BTC": 2.5,
    "TRX": 15000.00,
    "TON": 5000.00,
    "ETH": 10.0
  }
}
```

#### Get Specific Balance
```http
GET /api/balances/{currency}
```

**Parameters:**
- `currency` (required): Currency code (USD, EUR, GBP, BTC, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "currency": "USD",
    "balance": 5000.00,
    "symbol": "$"
  }
}
```

#### Update Balance (Admin Only)
```http
PUT /api/balances/{currency}
```

**Request Body:**
```json
{
  "amount": 10000.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Balance updated successfully"
}
```

---

### 3. Transactions

#### Send Money
```http
POST /api/transactions/send
```

**Request Body:**
```json
{
  "currency": "USD",
  "amount": 500.00,
  "recipient": "recipient@example.com",
  "bank": "commercial",
  "reference": "TXN-123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_abc123xyz",
    "status": "completed",
    "amount": 500.00,
    "currency": "USD",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Receive Money
```http
POST /api/transactions/receive
```

**Request Body:**
```json
{
  "currency": "EUR",
  "amount": 1000.00,
  "sender": "sender@example.com",
  "reference": "REC-789012"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "rec_def456uvw",
    "status": "completed",
    "amount": 1000.00,
    "currency": "EUR",
    "timestamp": "2024-01-15T11:45:00Z"
  }
}
```

#### Transfer Between Currencies
```http
POST /api/transactions/transfer
```

**Request Body:**
```json
{
  "from_currency": "USD",
  "to_currency": "EUR",
  "amount": 1000.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "trf_ghi789rst",
    "from_amount": 1000.00,
    "to_amount": 920.00,
    "rate": 0.92,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### Get Transaction History
```http
GET /api/transactions/history
```

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Filter by type (send, receive, transfer)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_abc123xyz",
      "type": "send",
      "amount": 500.00,
      "currency": "USD",
      "recipient": "recipient@example.com",
      "status": "completed",
      "date": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### International Transfer (SWIFT)
```http
POST /api/transactions/international
```

**Request Body:**
```json
{
  "currency": "USD",
  "amount": 5000.00,
  "swift_code": "CHASUS33",
  "iban": "US12345678901234567890",
  "bank_name": "Chase Bank",
  "country": "United States",
  "recipient_name": "John Smith"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "int_jkl012mno",
    "status": "processing",
    "estimated_completion": "2024-01-16T12:00:00Z"
  }
}
```

---

### 4. Cryptocurrency

#### Create Wallet
```http
POST /api/crypto/wallet
```

**Request Body:**
```json
{
  "currency": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet_id": "wlt_btc_123",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "currency": "BTC",
    "balance": 0.0,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Get Wallets
```http
GET /api/crypto/wallets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "wallet_id": "wlt_btc_123",
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "currency": "BTC",
      "balance": 2.5,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Send Crypto
```http
POST /api/crypto/send
```

**Request Body:**
```json
{
  "currency": "BTC",
  "amount": 0.5,
  "recipient_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "cry_pqr345stu",
    "status": "completed",
    "amount": 0.5,
    "currency": "BTC",
    "tx_hash": "0xabc123...",
    "timestamp": "2024-01-15T13:00:00Z"
  }
}
```

#### Get Crypto Balance
```http
GET /api/crypto/balance/{currency}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currency": "BTC",
    "balance": 2.5,
    "usd_value": 125000.00
  }
}
```

---

### 5. Mining

#### Get Mining Status
```http
GET /api/mining/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currency_mining": {
      "USD": {
        "progress": 45,
        "next_payout": "2024-01-15T14:00:00Z",
        "target": 1000
      },
      "EUR": {
        "progress": 45,
        "next_payout": "2024-01-15T14:00:00Z",
        "target": 1000
      }
    },
    "crypto_mining": {
      "BTC": {
        "progress": 30,
        "next_payout": "2024-01-15T14:00:00Z",
        "target": 1
      }
    },
    "addresses_generated": 150,
    "total_mined": {
      "USD": 45000.00,
      "BTC": 15.5
    }
  }
}
```

#### Toggle Mining
```http
POST /api/mining/toggle
```

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mining activated successfully"
}
```

#### Get Generated Addresses
```http
GET /api/mining/addresses
```

**Query Parameters:**
- `limit` (optional): Number of addresses to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "currency": "BTC",
      "generated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 6. Trading

#### Get Trading Status
```http
GET /api/trading/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "robot_active": true,
    "capital": 10000.00,
    "profit": 2500.00,
    "total_trades": 150,
    "success_rate": 78.5
  }
}
```

#### Toggle Trading Robot
```http
POST /api/trading/toggle
```

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trading robot activated"
}
```

#### Place Trade
```http
POST /api/trading/order
```

**Request Body:**
```json
{
  "pair": "BTC/USD",
  "type": "buy",
  "amount": 5000.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "ord_vwx678yz",
    "status": "filled",
    "pair": "BTC/USD",
    "type": "buy",
    "amount": 5000.00,
    "price": 50000.00,
    "executed_at": "2024-01-15T14:00:00Z"
  }
}
```

#### Get Trading History
```http
GET /api/trading/history
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "order_id": "ord_vwx678yz",
      "pair": "BTC/USD",
      "type": "buy",
      "amount": 5000.00,
      "profit": 250.00,
      "status": "completed",
      "timestamp": "2024-01-15T14:00:00Z"
    }
  ]
}
```

#### Withdraw Profits
```http
POST /api/trading/withdraw-profit
```

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawn": 2500.00,
    "remaining_capital": 10000.00,
    "transferred_to": "main_balance"
  }
}
```

---

### 7. Notifications

#### Get Notifications
```http
GET /api/notifications
```

**Query Parameters:**
- `unread_only` (optional): Filter unread only (default: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "not_123",
      "type": "transaction",
      "message": "You received $500.00",
      "read": false,
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Mark Notification as Read
```http
PUT /api/notifications/{id}/read
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### Configure Alerts
```http
PUT /api/notifications/settings
```

**Request Body:**
```json
{
  "sms_alerts": true,
  "email_alerts": true,
  "mining_alerts": true,
  "trading_alerts": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert settings updated"
}
```

---

### 8. Admin (Admin Only)

#### Get System Statistics
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 1500,
    "total_transactions": 50000,
    "total_volume": 50000000.00,
    "active_sessions": 250,
    "system_status": "healthy"
  }
}
```

#### Get All Users
```http
GET /api/admin/users
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "usr_123",
      "username": "john_doe",
      "email": "john@example.com",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Update User Balance (Admin)
```http
PUT /api/admin/users/{user_id}/balance
```

**Request Body:**
```json
{
  "currency": "USD",
  "amount": 10000.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "User balance updated"
}
```

---

## Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

### Common Error Codes

- `AUTH_REQUIRED`: Authentication required
- `INVALID_API_KEY`: Invalid or expired API key
- `INSUFFICIENT_BALANCE`: Not enough balance for transaction
- `INVALID_AMOUNT`: Invalid amount specified
- `RECIPIENT_NOT_FOUND`: Recipient account not found
- `CURRENCY_NOT_SUPPORTED`: Currency not supported
- `NETWORK_ERROR`: Network connection error
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Rate Limiting

- **Standard Users**: 100 requests per minute
- **Premium Users**: 500 requests per minute
- **Admin Users**: Unlimited requests

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642238400
```

---

## Webhooks

You can configure webhooks to receive real-time notifications:

### Configure Webhook
```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["transaction", "mining", "trading"]
}
```

### Webhook Payload Example
```json
{
  "event": "transaction",
  "data": {
    "type": "receive",
    "amount": 500.00,
    "currency": "USD",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

---

## Testing

Use the API key from your profile to test endpoints:

```bash
curl -X GET https://your-domain.com/api/balances \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Support

For API support, contact: api-support@globalbanking.com

---

**Note**: This API documentation is for the demonstration application. In a production environment, additional security measures, validation, and monitoring would be required.
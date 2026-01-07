/**
 * Authentication Middleware
 * JWT and API key authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Protect routes - require JWT authentication
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Not authorized to access this route'
        }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'User no longer exists'
          }
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Account is not active'
          }
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or expired'
        }
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

// Protect routes with API key
exports.apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key is required'
        }
      });
    }

    // Find user by API key
    const user = await User.findByApiKey(apiKey);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
    }

    // Update last used time for API key
    const apiKeyIndex = user.apiKeys.findIndex(key => key.key === apiKey);
    if (apiKeyIndex !== -1) {
      user.apiKeys[apiKeyIndex].lastUsed = new Date();
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'API key authentication failed'
      }
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `User role '${req.user.role}' is not authorized to access this route`
        }
      });
    }
    next();
  };
};

// Check if user is owner or admin
exports.isOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'admin' || req.user._id.toString() === resourceUserId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Not authorized to access this resource'
    }
  });
};

// Check 2FA if enabled
exports.checkTwoFactor = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.settings.twoFactorEnabled) {
      return next();
    }

    const twoFactorCode = req.headers['x-2fa-code'];

    if (!twoFactorCode) {
      return res.status(403).json({
        success: false,
        error: {
          code: '2FA_REQUIRED',
          message: 'Two-factor authentication code required'
        }
      });
    }

    // Verify 2FA code (in production, use proper TOTP library)
    const isValid = twoFactorCode.length === 6 && /^\d+$/.test(twoFactorCode);

    if (!isValid) {
      // Log failed 2FA attempt
      await AuditLog.createLog({
        user: user._id,
        action: 'security_alert',
        description: 'Failed 2FA attempt',
        status: 'failure',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_2FA',
          message: 'Invalid two-factor authentication code'
        }
      });
    }

    next();
  } catch (error) {
    console.error('2FA check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Two-factor verification failed'
      }
    });
  }
};

// Optional auth - doesn't fail if not authenticated
exports.optional = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.status === 'active') {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but we don't fail
      }
    }

    next();
  } catch (error) {
    next();
  }
};
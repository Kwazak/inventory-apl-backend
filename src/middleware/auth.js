const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  console.log('=== AUTHENTICATION MIDDLEWARE ===');
  console.log('Path:', req.method, req.path);
  console.log('IP:', req.ip);
  
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan.'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization format');
      return res.status(401).json({
        success: false,
        message: 'Format token tidak valid.'
      });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      console.log('❌ Empty token');
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan.'
      });
    }
    
    console.log('✓ Token extracted, length:', token.length);
    
    // Verify token
    console.log('🔐 Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✓ Token verified, user ID:', decoded.id);
    
    // Find user
    console.log('🔍 Looking up user in database...');
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'full_name', 'email', 'role', 'is_active']
    });
    
    if (!user) {
      console.log('❌ User not found for ID:', decoded.id);
      logger.warn(`Token with invalid user ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid. User tidak ditemukan.'
      });
    }
    
    console.log('✓ User found:', user.username, '(', user.role, ')');
    
    // Check if user is active
    if (!user.is_active) {
      console.log('❌ User account is inactive:', user.username);
      logger.warn(`Inactive user attempted access: ${user.username}`);
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif. Silakan hubungi administrator.'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;
    
    console.log('✅ Authentication successful');
    console.log('User:', user.username, 'Role:', user.role);
    
    next();
    
  } catch (error) {
    console.error('=== AUTHENTICATION ERROR ===');
    console.error('Error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Invalid JWT token');
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT token expired');
      return res.status(401).json({
        success: false,
        message: 'Token telah kadaluarsa. Silakan login kembali.'
      });
    }
    
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Autentikasi gagal.'
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('=== AUTHORIZATION CHECK ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.userRole);
    
    if (!req.user) {
      console.log('❌ No user attached to request');
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log('❌ Insufficient permissions');
      logger.warn(`Unauthorized access attempt by ${req.user.username} (${req.user.role}) to ${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin yang diperlukan.',
        required: roles,
        current: req.user.role
      });
    }
    
    console.log('✅ Authorization successful');
    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (user && user.is_active) {
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;
      }
    }
  } catch (error) {
    // Silently fail - authentication is optional
    logger.debug('Optional auth failed:', error.message);
  }
  
  next();
};

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration (default: 24h)
 */
const generateToken = (user, expiresIn = '24h') => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
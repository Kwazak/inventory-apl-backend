const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Register new user
const register = async (req, res) => {
  console.log('=== REGISTER REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  try {
    const { username, password, full_name, email, role } = req.body;
    
    console.log(`Checking if username exists: ${username}`);
    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.log(`Username already exists: ${username}`);
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    // Check if email already exists
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      username,
      password: hashedPassword,
      full_name,
      email,
      role: role || 'staff',
      is_active: true
    });
    
    logger.info(`New user registered: ${username}`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  console.log('=== LOGIN REQUEST ===');
  console.log('Request IP:', req.ip);
  console.log('Request body:', { username: req.body.username, password: '[HIDDEN]' });
  
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({
        success: false,
        message: 'Username dan password harus diisi'
      });
    }
    
    console.log(`🔍 Looking for user: ${username}`);
    
    // Find user by username
    const user = await User.findOne({ 
      where: { username },
      attributes: ['id', 'username', 'password', 'full_name', 'email', 'role', 'is_active']
    });
    
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      logger.warn(`Failed login attempt for non-existent user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah. Silakan periksa kembali.'
      });
    }
    
    console.log(`✓ User found: ${username} (ID: ${user.id}, Role: ${user.role})`);
    
    // Check if user is active
    if (!user.is_active) {
      console.log(`❌ User account disabled: ${username}`);
      logger.warn(`Inactive user login attempt: ${username}`);
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.'
      });
    }
    
    console.log(`🔐 Verifying password for user: ${username}`);
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`❌ Invalid password for user: ${username}`);
      logger.warn(`Failed login attempt with wrong password: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah. Silakan periksa kembali.'
      });
    }
    
    console.log(`✓ Password verified for: ${username}`);
    console.log(`🔑 Generating JWT tokens...`);
    
    // Generate JWT tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    console.log(`✓ Tokens generated successfully`);
    
    // Update last login timestamp (optional)
    await user.update({ 
      last_login: new Date() 
    }).catch(err => console.log('Note: last_login field might not exist:', err.message));
    
    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };
    
    logger.info(`✅ User logged in successfully: ${username} (${user.role})`);
    console.log('=== LOGIN SUCCESS ===');
    console.log('User data:', userData);
    
    // Send response
    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        refreshToken,
        user: userData
      }
    });
    
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error:', error);
    logger.error('Login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server. Silakan coba lagi.'
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await user.update({ password: hashedPassword });
    
    logger.info(`Password changed for user: ${user.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, email } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    // Update user
    await user.update({
      full_name: full_name || user.full_name,
      email: email || user.email
    });
    
    logger.info(`Profile updated for user: ${user.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const { verifyRefreshToken } = require('../middleware/auth');
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled'
      });
    }
    
    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    logger.info(`Token refreshed for user: ${user.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          email: user.email
        }
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    
    logger.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Logout (optional - for token blacklist if implemented)
const logout = async (req, res) => {
  try {
    // In a real application, you might want to:
    // 1. Blacklist the token
    // 2. Remove refresh token from database
    // 3. Clear session
    
    logger.info(`User logged out: ${req.user?.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword
};
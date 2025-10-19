const User = require('../models/user');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const { Op } = require('sequelize');

/**
 * Get all users (Admin only)
 * @route GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    console.log('=== GET ALL USERS ===');
    console.log('Requested by:', req.user.username, '(', req.user.role, ')');

    const { page = 1, limit = 10, search = '', role = '', is_active } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (is_active !== undefined && is_active !== '') {
      where.is_active = is_active === 'true' || is_active === true;
    }

    // Get users
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    console.log('✓ Found', count, 'users');

    res.json({
      message: 'Daftar user berhasil diambil',
      data: {
        users: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting users:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      message: 'Gagal mengambil data user',
      error: error.message
    });
  }
};

/**
 * Get user by ID (Admin only)
 * @route GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    console.log('=== GET USER BY ID ===');
    console.log('User ID:', req.params.id);
    console.log('Requested by:', req.user.username);

    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }

    console.log('✓ User found:', user.username);

    res.json({
      message: 'User berhasil diambil',
      data: user
    });
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      message: 'Gagal mengambil data user',
      error: error.message
    });
  }
};

/**
 * Create new user (Admin only)
 * @route POST /api/users
 */
const createUser = async (req, res) => {
  try {
    console.log('=== CREATE USER ===');
    console.log('Data:', req.body);
    console.log('Created by:', req.user.username);

    const { username, password, full_name, role, email } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.log('❌ Username already exists');
      return res.status(400).json({
        message: 'Username sudah digunakan'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      password: hashedPassword,
      full_name,
      role: role || 'staff',
      email,
      is_active: true
    });

    console.log('✓ User created:', user.username);

    // Remove password from response
    const userData = user.toJSON();
    delete userData.password;

    res.status(201).json({
      message: 'User berhasil dibuat',
      data: userData
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      message: 'Gagal membuat user',
      error: error.message
    });
  }
};

/**
 * Update user (Admin only)
 * @route PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    console.log('=== UPDATE USER ===');
    console.log('User ID:', req.params.id);
    console.log('Data:', req.body);
    console.log('Updated by:', req.user.username);

    const { username, password, full_name, role, email, is_active } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }

    // Prevent self role modification
    if (user.id === req.user.id && role && role !== user.role) {
      console.log('❌ Cannot change own role');
      return res.status(403).json({
        message: 'Tidak dapat mengubah role sendiri'
      });
    }

    // Check if username is being changed and already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        console.log('❌ Username already exists');
        return res.status(400).json({
          message: 'Username sudah digunakan'
        });
      }
    }

    // Update fields
    const updates = {};
    if (username) updates.username = username;
    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;
    if (email !== undefined) updates.email = email;
    if (is_active !== undefined) updates.is_active = is_active;

    // Hash password if provided
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);

    console.log('✓ User updated:', user.username);

    // Remove password from response
    const userData = user.toJSON();
    delete userData.password;

    res.json({
      message: 'User berhasil diupdate',
      data: userData
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      message: 'Gagal mengupdate user',
      error: error.message
    });
  }
};

/**
 * Delete user (Admin only)
 * @route DELETE /api/users/:id
 */
/**
 * Delete user (Admin only)
 * @route DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    console.log('=== DELETE USER ===');
    console.log('User ID:', req.params.id);
    console.log('Deleted by:', req.user.username);

    const user = await User.findByPk(req.params.id);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      console.log('❌ Cannot delete self');
      return res.status(400).json({
        message: 'Tidak dapat menghapus user sendiri'
      });
    }

    await user.destroy();

    console.log('✓ User deleted:', user.username);

    res.json({
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      message: 'Gagal menghapus user',
      error: error.message
    });
  }
};

/**
 * Get user statistics (Admin only)
 * @route GET /api/users/stats
 */
const getUserStats = async (req, res) => {
  try {
    console.log('=== GET USER STATS ===');
    console.log('Requested by:', req.user.username);

    const { Op } = require('sequelize');

    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const inactiveUsers = await User.count({ where: { is_active: false } });
    
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    console.log('✓ Stats retrieved');

    // Convert to object with role as key
    const byRoleObject = {};
    usersByRole.forEach(r => {
      byRoleObject[r.role] = parseInt(r.dataValues.count);
    });

    res.json({
      message: 'Statistik user berhasil diambil',
      data: {
        totalUsers: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole: byRoleObject
      }
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      message: 'Gagal mengambil statistik user',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
};

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateUser, validateUserUpdate, validateId } = require('../middleware/validation');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');

// All user management routes require admin role

// Get user statistics
router.get('/stats', authenticate, authorize('admin'), getUserStats);

// Get all users
router.get('/', authenticate, authorize('admin'), getUsers);

// Get user by ID
router.get('/:id', authenticate, authorize('admin'), validateId, getUserById);

// Create new user
router.post('/', authenticate, authorize('admin'), validateUser, createUser);

// Update user
router.put('/:id', authenticate, authorize('admin'), validateId, validateUserUpdate, updateUser);

// Delete user
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteUser);

module.exports = router;

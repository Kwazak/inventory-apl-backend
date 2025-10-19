const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Public routes
router.post('/register', validateUser, register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

module.exports = router;
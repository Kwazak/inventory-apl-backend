const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboardSummary,
  getDashboardStats,
  getRecentActivities
} = require('../controllers/dashboardController');

// All dashboard routes are accessible by admin, staff, and viewer
// Get dashboard summary
router.get('/summary', authenticate, authorize('admin', 'staff', 'viewer'), getDashboardSummary);

// Get dashboard statistics
router.get('/stats', authenticate, authorize('admin', 'staff', 'viewer'), getDashboardStats);

// Get recent activities
router.get('/activities', authenticate, authorize('admin', 'staff', 'viewer'), getRecentActivities);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateCustomer, validateId, validatePagination } = require('../middleware/validation');
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomers
} = require('../controllers/customerController');

// Get all customers
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getCustomers);

// Export customers
router.get('/export', authenticate, authorize('admin'), exportCustomers);

// Get customer by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getCustomerById);

// Create new customer
router.post('/', authenticate, authorize('admin', 'staff'), validateCustomer, createCustomer);

// Update customer
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validateCustomer, updateCustomer);

// Delete customer
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteCustomer);

module.exports = router;
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateSupplier, validateId, validatePagination } = require('../middleware/validation');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  exportSuppliers
} = require('../controllers/supplierController');

// Get all suppliers
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getSuppliers);

// Export suppliers
router.get('/export', authenticate, authorize('admin'), exportSuppliers);

// Get supplier by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getSupplierById);

// Create new supplier
router.post('/', authenticate, authorize('admin', 'staff'), validateSupplier, createSupplier);

// Update supplier
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validateSupplier, updateSupplier);

// Delete supplier
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteSupplier);

module.exports = router;
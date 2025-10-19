const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateSalesOrder, validateSOItem, validateId, validatePagination } = require('../middleware/validation');
const {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  confirmSalesOrder,
  shipSalesOrder,
  completeSalesOrder,
  cancelSalesOrder
} = require('../controllers/salesController');

// Get all sales orders
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getSalesOrders);

// Get sales order by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getSalesOrderById);

// Create new sales order
router.post('/', authenticate, authorize('admin', 'staff'), validateSalesOrder, createSalesOrder);

// Update sales order
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validateSalesOrder, updateSalesOrder);

// Delete sales order
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteSalesOrder);

// Confirm sales order
router.patch('/:id/confirm', authenticate, authorize('admin', 'staff'), validateId, confirmSalesOrder);

// Ship sales order
router.patch('/:id/ship', authenticate, authorize('admin', 'staff'), validateId, shipSalesOrder);

// Complete sales order
router.patch('/:id/complete', authenticate, authorize('admin', 'staff'), validateId, completeSalesOrder);

// Cancel sales order
router.patch('/:id/cancel', authenticate, authorize('admin', 'staff'), validateId, cancelSalesOrder);

module.exports = router;
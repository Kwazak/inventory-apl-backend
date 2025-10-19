const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateWorkOrder, validateWorkOrderUpdate, validateId, validatePagination } = require('../middleware/validation');
const {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  getWorkOrderBOMRequirements
} = require('../controllers/workOrderController');

// Get all work orders
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getWorkOrders);

// Get work order by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getWorkOrderById);

// Get BOM requirements for work order
router.get('/:id/bom-requirements', authenticate, authorize('admin', 'staff'), validateId, getWorkOrderBOMRequirements);

// Create new work order
router.post('/', authenticate, authorize('admin'), validateWorkOrder, createWorkOrder);

// Update work order
router.put('/:id', authenticate, authorize('admin'), validateId, validateWorkOrderUpdate, updateWorkOrder);

// Delete work order
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteWorkOrder);

// Start work order
router.patch('/:id/start', authenticate, authorize('admin', 'staff'), validateId, startWorkOrder);

// Complete work order
router.patch('/:id/complete', authenticate, authorize('admin', 'staff'), validateId, completeWorkOrder);

// Cancel work order
router.patch('/:id/cancel', authenticate, authorize('admin'), validateId, cancelWorkOrder);

module.exports = router;
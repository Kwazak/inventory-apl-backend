const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateBOM, validateBOMUpdate, validateId, validatePagination } = require('../middleware/validation');
const {
  getBOMs,
  getBOMById,
  createBOM,
  updateBOM,
  deleteBOM,
  getBOMByProductId
} = require('../controllers/bomController');

// Get all BOM items
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getBOMs);

// Get BOM by product ID
router.get('/product/:productId', authenticate, authorize('admin', 'staff'), getBOMByProductId);

// Get BOM by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getBOMById);

// Create new BOM
router.post('/', authenticate, authorize('admin', 'staff'), validateBOM, createBOM);

// Update BOM
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validateBOMUpdate, updateBOM);

// Delete BOM
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteBOM);

module.exports = router;
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateMaterial, validateId, validatePagination } = require('../middleware/validation');
const {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  exportMaterials
} = require('../controllers/materialController');

// Get all materials
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getMaterials);

// Get low stock materials
router.get('/low-stock', authenticate, authorize('admin', 'staff'), getLowStockMaterials);

// Export materials
router.get('/export', authenticate, authorize('admin'), exportMaterials);

// Get material by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getMaterialById);

// Create new material
router.post('/', authenticate, authorize('admin', 'staff'), validateMaterial, createMaterial);

// Update material
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validateMaterial, updateMaterial);

// Delete material
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteMaterial);

module.exports = router;
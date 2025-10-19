const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateProduct, validateId, validatePagination } = require('../middleware/validation');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  exportProducts
} = require('../controllers/productController');

// Get all products
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, getProducts);

// Get low stock products
router.get('/low-stock', authenticate, authorize('admin', 'staff'), getLowStockProducts);

// Export products
router.get('/export', authenticate, authorize('admin'), exportProducts);

// Get product by ID
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, getProductById);

// Create new product
router.post('/', authenticate, authorize('admin', 'staff'), validateProduct, createProduct);

// Update product
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validateProduct, updateProduct);

// Delete product
router.delete('/:id', authenticate, authorize('admin'), validateId, deleteProduct);

module.exports = router;
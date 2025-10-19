const { Product, BOM, RawMaterial, SalesOrderItem, WorkOrder } = require('../models');
const { paginate, paginationMeta, buildSearchQuery, exportToExcel } = require('../utils/helpers');
const { sequelize } = require('../utils/database');
const { Op } = require('sequelize');
const logger = require('../config/logger');

// Get all products with pagination and search
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (search) {
      Object.assign(whereClause, buildSearchQuery(['name', 'sku'], search));
    }
    
    // Get products
    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit: pageLimit,
      offset,
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${rows.length} products (page ${page})`);
    
    // Send response
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id, {
      include: [{
        model: BOM,
        as: 'bomItems',
        include: [{
          model: RawMaterial,
          as: 'material',
          attributes: ['id', 'name', 'sku', 'unit', 'stock']
        }]
      }]
    });
    
    if (!product) {
      logger.warn(`Product not found: ID ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    logger.info(`Retrieved product: ${product.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Error getting product ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const { sku, name } = req.body;
    
    // Check SKU uniqueness
    const existingSKU = await Product.findOne({ where: { sku } });
    if (existingSKU) {
      logger.warn(`Product creation failed: SKU ${sku} already exists`);
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    
    const product = await Product.create(req.body);
    
    logger.info(`New product created: ${name} (SKU: ${sku}, ID: ${product.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku } = req.body;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      logger.warn(`Product update failed: Product ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check SKU uniqueness if SKU is being changed
    if (sku && sku !== product.sku) {
      const existingSKU = await Product.findOne({ where: { sku } });
      if (existingSKU) {
        logger.warn(`Product update failed: SKU ${sku} already exists`);
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }
    
    await product.update(req.body);
    
    logger.info(`Product updated: ${product.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    logger.error(`Error updating product ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      logger.warn(`Product deletion failed: Product ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product has BOM entries
    const bomCount = await BOM.count({ where: { product_id: id } });
    if (bomCount > 0) {
      logger.warn(`Product deletion blocked: Product ID ${id} has ${bomCount} BOM entries`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It has ${bomCount} BOM entries. Delete BOM entries first.`
      });
    }
    
    // Check if product has sales orders
    const soCount = await SalesOrderItem.count({
      where: { product_id: id },
      include: [{
        association: 'SalesOrder',
        where: { status: ['pending', 'approved'] }
      }]
    });
    if (soCount > 0) {
      logger.warn(`Product deletion blocked: Product ID ${id} has ${soCount} pending/approved SO items`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It has ${soCount} pending or approved sales order items.`
      });
    }
    
    // Check if product has work orders
    const woCount = await WorkOrder.count({
      where: { 
        product_id: id,
        status: ['pending', 'in_progress']
      }
    });
    if (woCount > 0) {
      logger.warn(`Product deletion blocked: Product ID ${id} has ${woCount} active work orders`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It has ${woCount} pending or in-progress work orders.`
      });
    }
    
    const productName = product.name;
    await product.destroy();
    
    logger.info(`Product deleted: ${productName} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting product ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        [Op.and]: [
          { stock: { [Op.lte]: sequelize.col('min_stock') } },
          { status: 'active' }
        ]
      },
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${products.length} low stock products`);
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    logger.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export products to Excel
const exportProducts = async (req, res) => {
  try {
    const { status, type } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    // Get products
    const products = await Product.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Format data for export
    const exportData = products.map(product => ({
      SKU: product.sku,
      Name: product.name,
      Category: product.category,
      Type: product.type,
      Size: product.size,
      Color: product.color,
      'Unit Price': product.unit_price,
      Stock: product.stock,
      'Min Stock': product.min_stock,
      Status: product.status
    }));
    
    // Export to Excel
    const filename = `products_${Date.now()}.xlsx`;
    exportToExcel(exportData, filename);
    
    logger.info(`Exported ${products.length} products to Excel`);
    
    // Send file
    res.download(filename, (err) => {
      if (err) {
        logger.error('Error downloading export file:', err);
        res.status(500).json({
          success: false,
          message: 'Error exporting file'
        });
      }
    });
  } catch (error) {
    logger.error('Error exporting products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  exportProducts
};
const { BOM, Product, RawMaterial } = require('../models');
const { paginate, paginationMeta, buildSearchQuery, calculateBOMRequirements } = require('../utils/helpers');
const logger = require('../config/logger');

// Get all BOM items with pagination and search
const getBOMs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, product_id, material_id } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (product_id) {
      whereClause.product_id = product_id;
    }
    
    if (material_id) {
      whereClause.material_id = material_id;
    }
    
    // Get BOM items
    const { count, rows } = await BOM.findAndCountAll({
      where: whereClause,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: RawMaterial, as: 'material', attributes: ['id', 'sku', 'name', 'unit'] }
      ],
      limit: pageLimit,
      offset,
      order: [['product_id', 'ASC'], ['material_id', 'ASC']]
    });
    
    logger.info(`Retrieved ${rows.length} BOM items (page ${page})`);
    
    // Send response
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting BOM items:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get BOM by ID
const getBOMById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bom = await BOM.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: RawMaterial, as: 'material', attributes: ['id', 'sku', 'name', 'unit'] }
      ]
    });
    
    if (!bom) {
      logger.warn(`BOM not found: ID ${id}`);
      return res.status(404).json({
        success: false,
        message: 'BOM not found'
      });
    }
    
    logger.info(`Retrieved BOM: Product ${bom.product_id} - Material ${bom.material_id} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      data: bom
    });
  } catch (error) {
    logger.error(`Error getting BOM ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new BOM
const createBOM = async (req, res) => {
  try {
    const { product_id, material_id } = req.body;
    
    // Check for duplicate BOM entry
    const existingBOM = await BOM.findOne({
      where: { product_id, material_id }
    });
    
    if (existingBOM) {
      logger.warn(`BOM creation failed: Duplicate entry for Product ${product_id} - Material ${material_id}`);
      return res.status(400).json({
        success: false,
        message: 'BOM entry already exists for this product-material combination'
      });
    }
    
    const bom = await BOM.create(req.body);
    
    // Get the created BOM with associations
    const newBOM = await BOM.findByPk(bom.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: RawMaterial, as: 'material', attributes: ['id', 'sku', 'name', 'unit'] }
      ]
    });
    
    logger.info(`New BOM created: Product ${product_id} - Material ${material_id} (ID: ${bom.id})`);
    
    res.status(201).json({
      success: true,
      message: 'BOM created successfully',
      data: newBOM
    });
  } catch (error) {
    logger.error('Error creating BOM:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update BOM
const updateBOM = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, material_id } = req.body;
    
    const bom = await BOM.findByPk(id);
    
    if (!bom) {
      logger.warn(`BOM update failed: BOM ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'BOM not found'
      });
    }
    
    // Check for duplicate if product_id or material_id is being changed
    if ((product_id && product_id !== bom.product_id) || (material_id && material_id !== bom.material_id)) {
      const existingBOM = await BOM.findOne({
        where: {
          product_id: product_id || bom.product_id,
          material_id: material_id || bom.material_id
        }
      });
      
      if (existingBOM && existingBOM.id !== parseInt(id)) {
        logger.warn(`BOM update failed: Duplicate entry for Product ${product_id || bom.product_id} - Material ${material_id || bom.material_id}`);
        return res.status(400).json({
          success: false,
          message: 'BOM entry already exists for this product-material combination'
        });
      }
    }
    
    await bom.update(req.body);
    
    // Get the updated BOM with associations
    const updatedBOM = await BOM.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: RawMaterial, as: 'material', attributes: ['id', 'sku', 'name', 'unit'] }
      ]
    });
    
    logger.info(`BOM updated: Product ${updatedBOM.product_id} - Material ${updatedBOM.material_id} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'BOM updated successfully',
      data: updatedBOM
    });
  } catch (error) {
    logger.error(`Error updating BOM ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete BOM
const deleteBOM = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bom = await BOM.findByPk(id);
    
    if (!bom) {
      logger.warn(`BOM deletion failed: BOM ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'BOM not found'
      });
    }
    
    const productId = bom.product_id;
    const materialId = bom.material_id;
    await bom.destroy();
    
    logger.info(`BOM deleted: Product ${productId} - Material ${materialId} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'BOM deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting BOM ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get BOM by product ID
const getBOMByProductId = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const bomItems = await BOM.findAll({
      where: { product_id: productId },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: RawMaterial, as: 'material', attributes: ['id', 'sku', 'name', 'unit', 'stock'] }
      ],
      order: [['material_id', 'ASC']]
    });
    
    logger.info(`Retrieved ${bomItems.length} BOM items for Product ${productId}`);
    
    res.status(200).json({
      success: true,
      data: bomItems
    });
  } catch (error) {
    logger.error(`Error getting BOM for Product ${req.params.productId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Calculate material requirements for production
const calculateRequirements = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity = 1 } = req.query;
    
    // Get product
    const product = await Product.findByPk(productId);
    if (!product) {
      logger.warn(`Calculate requirements failed: Product ID ${productId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Calculate requirements using helper function
    const requirements = await calculateBOMRequirements(productId, parseInt(quantity));
    
    logger.info(`Calculated material requirements for Product ${productId}, quantity: ${quantity}`);
    
    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku
        },
        quantity: parseInt(quantity),
        requirements
      }
    });
  } catch (error) {
    logger.error(`Error calculating requirements for Product ${req.params.productId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getBOMs,
  getBOMById,
  createBOM,
  updateBOM,
  deleteBOM,
  getBOMByProductId,
  calculateRequirements
};
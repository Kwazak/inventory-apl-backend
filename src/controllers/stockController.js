const { StockLog, RawMaterial, Product, User } = require('../models');
const logger = require('../config/logger');
const { paginate, paginationMeta, buildSearchQuery, updateStock, logStockMovement } = require('../utils/helpers');
const { sequelize } = require('../utils/database');

// Get all stock logs with pagination and search
const getStockLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, item_type, movement_type, reference_type } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (item_type) {
      whereClause.item_type = item_type;
    }
    
    if (movement_type) {
      whereClause.movement_type = movement_type;
    }
    
    if (reference_type) {
      whereClause.reference_type = reference_type;
    }
    
    // Get stock logs
    const { count, rows } = await StockLog.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      limit: pageLimit,
      offset,
      order: [['created_at', 'DESC']]
    });
    
    // Enrich data with item details
    const enrichedLogs = await Promise.all(rows.map(async (log) => {
      let itemDetails = null;
      
      if (log.item_type === 'material') {
        const material = await RawMaterial.findByPk(log.item_id, {
          attributes: ['id', 'sku', 'name', 'unit']
        });
        itemDetails = material;
      } else if (log.item_type === 'product') {
        const product = await Product.findByPk(log.item_id, {
          attributes: ['id', 'sku', 'name', 'type', 'size', 'color']
        });
        itemDetails = product;
      }
      
      return {
        ...log.toJSON(),
        item: itemDetails
      };
    }));
    
    logger.info(`Retrieved ${enrichedLogs.length} stock logs (page ${page})`);
    // Send response
    res.status(200).json({
      success: true,
      data: enrichedLogs,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting stock logs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock summary
const getStockSummary = async (req, res) => {
  try {
    // Get material summary
    const materialSummary = await RawMaterial.findAll({
      attributes: [
        'id',
        'sku',
        'name',
        'unit',
        'stock',
        'min_stock',
        [sequelize.literal('(stock - min_stock)'), 'difference']
      ],
      where: { status: 'active' },
      order: [['name', 'ASC']]
    });
    
    // Get product summary
    const productSummary = await Product.findAll({
      attributes: [
        'id',
        'sku',
        'name',
        'type',
        'size',
        'color',
        'stock',
        'min_stock',
        [sequelize.literal('(stock - min_stock)'), 'difference']
      ],
      where: { status: 'active' },
      order: [['name', 'ASC']]
    });
    
    // Get low stock items
    const lowStockMaterials = materialSummary.filter(item => item.stock <= item.min_stock);
    const lowStockProducts = productSummary.filter(item => item.stock <= item.min_stock);
    
    // Get dashboard summary
    const dashboardSummary = {
      total_materials: materialSummary.length,
      total_products: productSummary.length,
      low_stock_materials: lowStockMaterials.length,
      low_stock_products: lowStockProducts.length,
      total_material_stock: materialSummary.reduce((sum, item) => sum + item.stock, 0),
      total_product_stock: productSummary.reduce((sum, item) => sum + item.stock, 0)
    };
    
    logger.info('Retrieved stock summary');
    res.status(200).json({
      success: true,
      data: {
        materials: materialSummary,
        products: productSummary,
        low_stock_materials: lowStockMaterials,
        low_stock_products: lowStockProducts,
        dashboard_summary: dashboardSummary
      }
    });
  } catch (error) {
    logger.error('Error getting stock summary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Adjust stock
const adjustStock = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { item_type, item_id, new_stock, notes } = req.body;
    
    // Find current stock
    let currentStock = 0;
    let item = null;
    
    if (item_type === 'material') {
  item = await RawMaterial.findByPk(item_id, { transaction });
      
      if (!item) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Material not found'
        });
      }
      
      currentStock = item.stock;
    } else if (item_type === 'product') {
  item = await Product.findByPk(item_id, { transaction });
      
      if (!item) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      currentStock = item.stock;
    } else {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid item type'
      });
    }
    
    // Calculate adjustment quantity
    const adjustmentQuantity = new_stock - currentStock;
    
    if (adjustmentQuantity === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No adjustment needed'
      });
    }
    
    // Update stock
    await updateStock(item_type, item_id, 'adjust', new_stock, transaction);

    // Log stock movement
    await logStockMovement(
      item_type,
      item_id,
      'adjust',
      Math.abs(adjustmentQuantity),
      'ADJUSTMENT',
      null,
      notes || `Stock adjusted from ${currentStock} to ${new_stock}`,
      req.user.id,
      transaction
    );

    // Commit transaction
    await transaction.commit();
    logger.info(`Stock adjusted: ${item_type} ${item_id} from ${currentStock} to ${new_stock} by user ${req.user.id}`);
    
    // Get updated item
    let updatedItem = null;
    
    if (item_type === 'material') {
      updatedItem = await RawMaterial.findByPk(item_id);
    } else if (item_type === 'product') {
      updatedItem = await Product.findByPk(item_id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        previous_stock: currentStock,
        new_stock,
        adjustment_quantity: adjustmentQuantity,
        item: updatedItem
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock movements by item
const getStockMovementsByItem = async (req, res) => {
  try {
    const { item_type, item_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {
      item_type,
      item_id
    };
    
    // Get stock logs
    const { count, rows } = await StockLog.findAndCountAll({ where: whereClause, include: [ { model: User, as: 'creator', attributes: ['id', 'full_name'] } ], limit: pageLimit, offset, order: [['created_at', 'DESC']] });
    
    // Get item details
    let itemDetails = null;
    
    if (item_type === 'material') {
      itemDetails = await RawMaterial.findByPk(item_id, {
        attributes: ['id', 'sku', 'name', 'unit', 'stock']
      });
    } else if (item_type === 'product') {
      itemDetails = await Product.findByPk(item_id, {
        attributes: ['id', 'sku', 'name', 'type', 'size', 'color', 'stock']
      });
    }
    
    // Send response
    logger.info(`Retrieved ${rows.length} stock movements for ${item_type} ${item_id}`);
    res.status(200).json({ success: true, data: { item: itemDetails, movements: rows, meta: paginationMeta(page, limit, count) } });
  } catch (error) {
    logger.error('Error getting stock movements by item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStockLogs,
  getStockSummary,
  adjustStock,
  getStockMovementsByItem
};
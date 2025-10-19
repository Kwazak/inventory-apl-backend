const { RawMaterial, Supplier, BOM, PurchaseOrderItem } = require('../models');
const { paginate, paginationMeta, buildSearchQuery, exportToExcel } = require('../utils/helpers');
const { sequelize } = require('../utils/database');
const { Op } = require('sequelize');
const logger = require('../config/logger');

// Get all materials with pagination and search
const getMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, supplier_id } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (supplier_id) {
      whereClause.supplier_id = supplier_id;
    }
    
    if (search) {
      Object.assign(whereClause, buildSearchQuery(['name', 'sku'], search));
    }
    
    // Get materials
    const { count, rows } = await RawMaterial.findAndCountAll({
      where: whereClause,
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name'] }],
      limit: pageLimit,
      offset,
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${rows.length} materials (page ${page})`);
    
    // Send response
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting materials:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get material by ID
const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const material = await RawMaterial.findByPk(id, {
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name', 'contact', 'phone'] }]
    });
    
    if (!material) {
      logger.warn(`Material not found: ID ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    logger.info(`Retrieved material: ${material.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      data: material
    });
  } catch (error) {
    logger.error(`Error getting material ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new material
const createMaterial = async (req, res) => {
  try {
    const { sku, name } = req.body;
    
    // Check SKU uniqueness
    const existingSKU = await RawMaterial.findOne({ where: { sku } });
    if (existingSKU) {
      logger.warn(`Material creation failed: SKU ${sku} already exists`);
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    
    const material = await RawMaterial.create(req.body);
    
    logger.info(`New material created: ${name} (SKU: ${sku}, ID: ${material.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: material
    });
  } catch (error) {
    logger.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku } = req.body;
    
    const material = await RawMaterial.findByPk(id);
    
    if (!material) {
      logger.warn(`Material update failed: Material ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    // Check SKU uniqueness if SKU is being changed
    if (sku && sku !== material.sku) {
      const existingSKU = await RawMaterial.findOne({ where: { sku } });
      if (existingSKU) {
        logger.warn(`Material update failed: SKU ${sku} already exists`);
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }
    
    await material.update(req.body);
    
    logger.info(`Material updated: ${material.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Material updated successfully',
      data: material
    });
  } catch (error) {
    logger.error(`Error updating material ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const material = await RawMaterial.findByPk(id);
    
    if (!material) {
      logger.warn(`Material deletion failed: Material ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    // Check if material is used in BOM
    const bomUsage = await BOM.count({ where: { material_id: id } });
    if (bomUsage > 0) {
      logger.warn(`Material deletion blocked: Material ID ${id} is used in ${bomUsage} BOM entries`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete material. It is used in ${bomUsage} BOM entries.`
      });
    }
    
    // Check if material has pending purchase orders
    const poUsage = await PurchaseOrderItem.count({
      where: { material_id: id },
      include: [{
        association: 'PurchaseOrder',
        where: { status: ['pending', 'approved'] }
      }]
    });
    if (poUsage > 0) {
      logger.warn(`Material deletion blocked: Material ID ${id} has ${poUsage} pending/approved PO items`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete material. It has ${poUsage} pending or approved purchase order items.`
      });
    }
    
    const materialName = material.name;
    await material.destroy();
    
    logger.info(`Material deleted: ${materialName} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting material ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get low stock materials
const getLowStockMaterials = async (req, res) => {
  try {
    const materials = await RawMaterial.findAll({
      where: {
        [Op.and]: [
          { stock: { [Op.lte]: sequelize.col('min_stock') } },
          { status: 'active' }
        ]
      },
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name', 'contact', 'phone'] }],
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${materials.length} low stock materials`);
    
    res.status(200).json({
      success: true,
      data: materials,
      count: materials.length
    });
  } catch (error) {
    logger.error('Error getting low stock materials:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export materials to Excel
const exportMaterials = async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (supplier_id) {
      whereClause.supplier_id = supplier_id;
    }
    
    // Get materials
    const materials = await RawMaterial.findAll({
      where: whereClause,
      include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }],
      order: [['name', 'ASC']]
    });
    
    // Format data for export
    const exportData = materials.map(material => ({
      SKU: material.sku,
      Name: material.name,
      Category: material.category,
      Unit: material.unit,
      'Unit Price': material.unit_price,
      Stock: material.stock,
      'Min Stock': material.min_stock,
      Supplier: material.supplier ? material.supplier.name : '',
      Status: material.status
    }));
    
    // Export to Excel
    const filename = `materials_${Date.now()}.xlsx`;
    exportToExcel(exportData, filename);
    
    logger.info(`Exported ${materials.length} materials to Excel`);
    
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
    logger.error('Error exporting materials:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  exportMaterials
};
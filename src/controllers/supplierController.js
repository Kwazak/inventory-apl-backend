const { Supplier, RawMaterial, PurchaseOrder } = require('../models');
const { paginate, paginationMeta, buildSearchQuery, exportToExcel } = require('../utils/helpers');
const logger = require('../config/logger');

// Get all suppliers with pagination and search
const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      Object.assign(whereClause, buildSearchQuery(['name', 'contact', 'phone'], search));
    }
    
    // Get suppliers
    const { count, rows } = await Supplier.findAndCountAll({
      where: whereClause,
      limit: pageLimit,
      offset,
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${rows.length} suppliers (page ${page})`);
    
    // Send response
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting suppliers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findByPk(id, {
      include: [
        { 
          model: RawMaterial, 
          as: 'materials',
          attributes: ['id', 'name', 'sku', 'stock'] 
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrders',
          attributes: ['id', 'po_number', 'order_date', 'status', 'total_amount'],
          limit: 5,
          order: [['order_date', 'DESC']]
        }
      ]
    });
    
    if (!supplier) {
      logger.warn(`Supplier not found: ID ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    logger.info(`Retrieved supplier: ${supplier.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    logger.error(`Error getting supplier ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new supplier
const createSupplier = async (req, res) => {
  try {
    const { name } = req.body;
    
    const supplier = await Supplier.create(req.body);
    
    logger.info(`New supplier created: ${name} (ID: ${supplier.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    logger.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      logger.warn(`Supplier update failed: Supplier ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    await supplier.update(req.body);
    
    logger.info(`Supplier updated: ${supplier.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    logger.error(`Error updating supplier ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      logger.warn(`Supplier deletion failed: Supplier ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    // Check if supplier has materials
    const materialCount = await RawMaterial.count({ where: { supplier_id: id } });
    if (materialCount > 0) {
      logger.warn(`Supplier deletion blocked: Supplier ID ${id} has ${materialCount} materials`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier. It has ${materialCount} associated materials.`
      });
    }
    
    // Check if supplier has purchase orders
    const poCount = await PurchaseOrder.count({
      where: { 
        supplier_id: id,
        status: ['pending', 'approved']
      }
    });
    if (poCount > 0) {
      logger.warn(`Supplier deletion blocked: Supplier ID ${id} has ${poCount} active purchase orders`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier. It has ${poCount} pending or approved purchase orders.`
      });
    }
    
    const supplierName = supplier.name;
    await supplier.destroy();
    
    logger.info(`Supplier deleted: ${supplierName} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting supplier ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get active suppliers
const getActiveSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'contact', 'phone'],
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${suppliers.length} active suppliers`);
    
    res.status(200).json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    logger.error('Error getting active suppliers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export suppliers to Excel
const exportSuppliers = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    // Get suppliers
    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Format data for export
    const exportData = suppliers.map(supplier => ({
      Name: supplier.name,
      Contact: supplier.contact,
      Phone: supplier.phone,
      Address: supplier.address,
      Status: supplier.status
    }));
    
    // Export to Excel
    const filename = `suppliers_${Date.now()}.xlsx`;
    exportToExcel(exportData, filename);
    
    logger.info(`Exported ${suppliers.length} suppliers to Excel`);
    
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
    logger.error('Error exporting suppliers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getActiveSuppliers,
  exportSuppliers
};
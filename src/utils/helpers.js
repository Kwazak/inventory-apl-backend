const { Op } = require('sequelize');
const XLSX = require('xlsx');

// Generate pagination response
const paginate = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit), offset };
};

// Generate pagination metadata
const paginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    currentPage: parseInt(page),
    totalPages,
    totalItems: total,
    itemsPerPage: parseInt(limit),
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

// Build search query
const buildSearchQuery = (searchFields, searchTerm) => {
  if (!searchTerm || !searchFields.length) return {};
  
  return {
    [Op.or]: searchFields.map(field => ({
      [field]: {
        [Op.like]: `%${searchTerm}%`
      }
    }))
  };
};

// Generate order number
const generateOrderNumber = (prefix) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${prefix}${year}${month}${day}${random}`;
};

// Export data to Excel
const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Set column widths
  const cols = [];
  Object.keys(data[0] || {}).forEach(() => {
    cols.push({ wch: 15 });
  });
  worksheet['!cols'] = cols;
  
  // Write file
  XLSX.writeFile(workbook, filename);
  return filename;
};

// Calculate BOM requirements
const calculateBOMRequirements = async (productId, quantity) => {
  const { BOM, RawMaterial } = require('../models');
  
  // Get BOM for the product
  const bomItems = await BOM.findAll({
    where: { product_id: productId },
    include: [{ model: RawMaterial, as: 'material' }]
  });
  
  // Calculate required materials
  const requirements = bomItems.map(item => ({
    material_id: item.material_id,
    material_name: item.material.name,
    material_sku: item.material.sku,
    required_quantity: item.quantity * quantity,
    unit: item.material.unit,
    current_stock: item.material.stock,
    shortage: Math.max(0, (item.quantity * quantity) - item.material.stock)
  }));
  
  return requirements;
};

// Update stock based on movement
const updateStock = async (itemType, itemId, movementType, quantity, transaction) => {
  const { RawMaterial, Product } = require('../models');
  
  if (itemType === 'material') {
    const material = await RawMaterial.findByPk(itemId, { transaction });
    
    if (!material) {
      throw new Error('Material not found');
    }
    
    if (movementType === 'in') {
      material.stock += quantity;
    } else if (movementType === 'out') {
      if (material.stock < quantity) {
        throw new Error('Insufficient stock');
      }
      material.stock -= quantity;
    } else if (movementType === 'adjust') {
      material.stock = quantity;
    }
    
    await material.save({ transaction });
    return material;
  } else if (itemType === 'product') {
    const product = await Product.findByPk(itemId, { transaction });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (movementType === 'in') {
      product.stock += quantity;
    } else if (movementType === 'out') {
      if (product.stock < quantity) {
        throw new Error('Insufficient stock');
      }
      product.stock -= quantity;
    } else if (movementType === 'adjust') {
      product.stock = quantity;
    }
    
    await product.save({ transaction });
    return product;
  }
  
  throw new Error('Invalid item type');
};

// Log stock movement
const logStockMovement = async (
  itemType,
  itemId,
  movementType,
  quantity,
  referenceType,
  referenceId,
  notes,
  createdBy,
  transaction
) => {
  const { StockLog } = require('../models');
  
  await StockLog.create({
    item_type: itemType,
    item_id: itemId,
    movement_type: movementType,
    quantity,
    reference_type: referenceType,
    reference_id: referenceId,
    notes,
    created_by: createdBy
  }, { transaction });
};

module.exports = {
  paginate,
  paginationMeta,
  buildSearchQuery,
  generateOrderNumber,
  exportToExcel,
  calculateBOMRequirements,
  updateStock,
  logStockMovement
};
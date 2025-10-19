const { SalesOrder, SOItem, Customer, Product, User } = require('../models');
const logger = require('../config/logger');
const { paginate, paginationMeta, buildSearchQuery, generateOrderNumber, updateStock, logStockMovement } = require('../utils/helpers');
const { sequelize } = require('../utils/database');

// Get all sales orders with pagination and search
const getSalesOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, customer_id } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customer_id) {
      whereClause.customer_id = customer_id;
    }
    
    if (search) {
      Object.assign(whereClause, buildSearchQuery(['so_number'], search));
    }
    
    // Get sales orders
    const { count, rows } = await SalesOrder.findAndCountAll({
      where: whereClause,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      limit: pageLimit,
      offset,
      order: [['order_date', 'DESC']]
    });
    
    // Send response
    logger.info(`Retrieved ${rows.length} sales orders (page ${page})`);
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting sales orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get sales order by ID
const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        {
          model: SOItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: salesOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new sales order
const createSalesOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { items, ...orderData } = req.body;
    
    // Generate SO number if not provided
    if (!orderData.so_number) {
      orderData.so_number = generateOrderNumber('SO');
    }
    
    // Set created_by
    orderData.created_by = req.user.id;
    
    // Create sales order
  const salesOrder = await SalesOrder.create(orderData, { transaction });
    
    // Create SO items and calculate total
    let total = 0;
    const soItems = [];
    
    for (const item of items) {
      const subtotal = item.quantity * item.price;
      total += subtotal;
      
      const soItem = await SOItem.create({
        so_id: salesOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal
      }, { transaction });
      
      soItems.push(soItem);
    }
    
    // Update total
  await salesOrder.update({ total }, { transaction });
    
    // Commit transaction
  await transaction.commit();
  logger.info(`New sales order created: ${salesOrder.so_number} (ID: ${salesOrder.id}), Items: ${items.length}, Total: ${total}`);
    
    // Get the created sales order with associations
    const newSalesOrder = await SalesOrder.findByPk(salesOrder.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        {
          model: SOItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Sales order created successfully',
      data: newSalesOrder
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update sales order
const updateSalesOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { items, ...orderData } = req.body;
    
    // Find sales order
  const salesOrder = await SalesOrder.findByPk(id, { transaction });
    
    if (!salesOrder) {
  await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    // Check if sales order can be updated
    if (salesOrder.status === 'shipped' || salesOrder.status === 'completed' || salesOrder.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot update sales order with status shipped, completed, or cancelled'
      });
    }
    
    // Update sales order
  await salesOrder.update(orderData, { transaction });
    
    // If items are provided, update them
    if (items) {
      // Delete existing items
      await SOItem.destroy({ where: { so_id: id }, transaction });
      
      // Create new items and calculate total
      let total = 0;
      
      for (const item of items) {
        const subtotal = item.quantity * item.price;
        total += subtotal;
        
        await SOItem.create({
          so_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          subtotal
        }, { transaction });
      }
      
      // Update total
  await salesOrder.update({ total }, { transaction });
    }
    
    // Commit transaction
  await transaction.commit();
  logger.info(`Sales order updated: ${salesOrder.so_number} (ID: ${id})`);
    
    // Get the updated sales order with associations
    const updatedSalesOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        {
          model: SOItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Sales order updated successfully',
      data: updatedSalesOrder
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete sales order
const deleteSalesOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find sales order
  const salesOrder = await SalesOrder.findByPk(id, { transaction });
    
    if (!salesOrder) {
  await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    // Check if sales order can be deleted
    if (salesOrder.status === 'shipped' || salesOrder.status === 'completed') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sales order with status shipped or completed'
      });
    }
    
    // Delete sales order (cascade will delete SO items)
  await salesOrder.destroy({ transaction });
    
    // Commit transaction
  await transaction.commit();
  logger.info(`Sales order deleted: ID ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Sales order deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Confirm sales order
const confirmSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find sales order
    const salesOrder = await SalesOrder.findByPk(id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    // Check if sales order can be confirmed
    if (salesOrder.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm sales order with status not pending'
      });
    }
    
    // Update sales order status
    await salesOrder.update({ status: 'confirmed' });
    
    res.status(200).json({
      success: true,
      message: 'Sales order confirmed successfully',
      data: salesOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Ship sales order
const shipSalesOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find sales order with items
    const salesOrder = await SalesOrder.findByPk(id, {
      include: [{ model: SOItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      transaction
    });
    
    if (!salesOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    // Check if sales order can be shipped
    if (salesOrder.status !== 'confirmed') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot ship sales order with status not confirmed'
      });
    }
    
    // Check if all products are available
    const insufficientProducts = [];
    
    for (const item of salesOrder.items) {
      if (item.product.stock < item.quantity) {
        insufficientProducts.push({
          product_id: item.product_id,
          product_name: item.product.name,
          required: item.quantity,
          available: item.product.stock,
          shortage: item.quantity - item.product.stock
        });
      }
    }
    
    if (insufficientProducts.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient products',
        data: insufficientProducts
      });
    }
    
    // Update stock for each item
    for (const item of salesOrder.items) {
      await updateStock('product', item.product_id, 'out', item.quantity, transaction);

      // Log stock movement
      await logStockMovement(
        'product',
        item.product_id,
        'out',
        item.quantity,
        'SO',
        salesOrder.id,
        `Sold in SO: ${salesOrder.so_number}`,
        req.user.id,
        transaction
      );
    }

    // Update sales order status
    await salesOrder.update({ status: 'shipped' }, { transaction });

    // Commit transaction
    await transaction.commit();
    logger.info(`Sales order shipped: ${salesOrder.so_number} (ID: ${salesOrder.id})`);
    
    res.status(200).json({
      success: true,
      message: 'Sales order shipped successfully',
      data: salesOrder
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Complete sales order
const completeSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find sales order
    const salesOrder = await SalesOrder.findByPk(id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    // Check if sales order can be completed
    if (salesOrder.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete sales order with status not shipped'
      });
    }
    
    // Update sales order status
    await salesOrder.update({ status: 'completed' });
    
    res.status(200).json({
      success: true,
      message: 'Sales order completed successfully',
      data: salesOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel sales order
const cancelSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find sales order
    const salesOrder = await SalesOrder.findByPk(id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    // Check if sales order can be cancelled
    if (salesOrder.status === 'shipped' || salesOrder.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel sales order with status shipped or completed'
      });
    }
    
    // Update sales order status
    await salesOrder.update({ status: 'cancelled' });
    
    res.status(200).json({
      success: true,
      message: 'Sales order cancelled successfully',
      data: salesOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  confirmSalesOrder,
  shipSalesOrder,
  completeSalesOrder,
  cancelSalesOrder
};
const { WorkOrder, Product, User } = require('../models');
const logger = require('../config/logger');
const { paginate, paginationMeta, buildSearchQuery, generateOrderNumber, calculateBOMRequirements, updateStock, logStockMovement } = require('../utils/helpers');
const { sequelize } = require('../utils/database');

// Get all work orders with pagination and search
const getWorkOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, product_id } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (product_id) {
      whereClause.product_id = product_id;
    }
    
    if (search) {
      Object.assign(whereClause, buildSearchQuery(['wo_number'], search));
    }
    
    // Get work orders
    const { count, rows } = await WorkOrder.findAndCountAll({
      where: whereClause,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      limit: pageLimit,
      offset,
      order: [['created_at', 'DESC']]
    });
    
    logger.info(`Retrieved ${rows.length} work orders (page ${page})`);
    // Send response
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting work orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get work order by ID
const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workOrder = await WorkOrder.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ]
    });
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: workOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new work order
const createWorkOrder = async (req, res) => {
  try {
    // Generate WO number if not provided
    if (!req.body.wo_number) {
      req.body.wo_number = generateOrderNumber('WO');
    }
    
    // Set created_by
    req.body.created_by = req.user.id;
    
    // Create work order
  const workOrder = await WorkOrder.create(req.body);
    
    // Get the created work order with associations
    const newWorkOrder = await WorkOrder.findByPk(workOrder.id, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ]
    });
    
    logger.info(`New work order created: ${newWorkOrder.wo_number} (ID: ${newWorkOrder.id})`);
    res.status(201).json({
      success: true,
      message: 'Work order created successfully',
      data: newWorkOrder
    });
  } catch (error) {
    logger.error('Error creating work order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update work order
const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Check if work order can be updated
    if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update work order with status completed or cancelled'
      });
    }
    
    // Update work order
    await workOrder.update(req.body);
    
    // Get the updated work order with associations
    const updatedWorkOrder = await WorkOrder.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Work order updated successfully',
      data: updatedWorkOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete work order
const deleteWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Check if work order can be deleted
    if (workOrder.status === 'in_progress' || workOrder.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete work order with status in_progress or completed'
      });
    }
    
    // Delete work order
    await workOrder.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Work order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Start work order
const startWorkOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id, { transaction });
    
    if (!workOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Check if work order can be started
    if (workOrder.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot start work order with status not pending'
      });
    }
    
    // Calculate BOM requirements
    const requirements = await calculateBOMRequirements(
      workOrder.product_id,
      workOrder.quantity_planned
    );
    
    // Check if all materials are available
    const insufficientMaterials = requirements.filter(req => req.shortage > 0);
    
    if (insufficientMaterials.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient materials',
        data: insufficientMaterials
      });
    }
    
    // Update stock for each material
    for (const r of requirements) {
      await updateStock('material', r.material_id, 'out', r.required_quantity, transaction);

      // Log stock movement
      await logStockMovement(
        'material',
        r.material_id,
        'out',
        r.required_quantity,
        'WO',
        workOrder.id,
        `Used for WO: ${workOrder.wo_number}`,
        req.user.id,
        transaction
      );
    }

    // Update work order status and start date
    await workOrder.update({ status: 'in_progress', start_date: new Date() }, { transaction });

    // Commit transaction
    await transaction.commit();
    logger.info(`Work order started: ${workOrder.wo_number} (ID: ${workOrder.id})`);

    res.status(200).json({ success: true, message: 'Work order started successfully', data: workOrder });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error starting work order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete work order
const completeWorkOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { quantity_produced } = req.body;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id, { transaction });
    
    if (!workOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Check if work order can be completed
    if (workOrder.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot complete work order with status not in_progress'
      });
    }
    
    // Validate quantity produced
    if (quantity_produced <= 0 || quantity_produced > workOrder.quantity_planned) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity produced'
      });
    }
    
    // Update product stock
    await updateStock('product', workOrder.product_id, 'in', quantity_produced, transaction);

    // Log stock movement
    await logStockMovement(
      'product',
      workOrder.product_id,
      'in',
      quantity_produced,
      'WO',
      workOrder.id,
      `Produced from WO: ${workOrder.wo_number}`,
      req.user.id,
      transaction
    );

    // Update work order status, completion date, and quantity produced
    await workOrder.update({ status: 'completed', completion_date: new Date(), quantity_produced }, { transaction });

    // Commit transaction
    await transaction.commit();
    logger.info(`Work order completed: ${workOrder.wo_number} (ID: ${workOrder.id}), produced: ${quantity_produced}`);

    res.status(200).json({ success: true, message: 'Work order completed successfully', data: workOrder });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error completing work order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel work order
const cancelWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Check if work order can be cancelled
    if (workOrder.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel work order with status completed'
      });
    }
    
    // Update work order status
    await workOrder.update({ status: 'cancelled' });
    
    res.status(200).json({
      success: true,
      message: 'Work order cancelled successfully',
      data: workOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get BOM requirements for work order
const getWorkOrderBOMRequirements = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Calculate BOM requirements
    const requirements = await calculateBOMRequirements(
      workOrder.product_id,
      workOrder.quantity_planned
    );
    
    res.status(200).json({
      success: true,
      data: requirements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  getWorkOrderBOMRequirements
};
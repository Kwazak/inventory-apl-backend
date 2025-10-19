const { Customer, SalesOrder } = require('../models');
const { paginate, paginationMeta, buildSearchQuery, exportToExcel } = require('../utils/helpers');
const logger = require('../config/logger');

// Get all customers with pagination and search
const getCustomers = async (req, res) => {
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
      Object.assign(whereClause, buildSearchQuery(['name', 'contact', 'phone'], search));
    }
    
    // Get customers
    const { count, rows } = await Customer.findAndCountAll({
      where: whereClause,
      limit: pageLimit,
      offset,
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${rows.length} customers (page ${page})`);
    
    // Send response
    res.status(200).json({
      success: true,
      data: rows,
      meta: paginationMeta(page, limit, count)
    });
  } catch (error) {
    logger.error('Error getting customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByPk(id, {
      include: [{
        model: SalesOrder,
        as: 'salesOrders',
        attributes: ['id', 'so_number', 'order_date', 'status', 'total_amount'],
        limit: 5,
        order: [['order_date', 'DESC']]
      }]
    });
    
    if (!customer) {
      logger.warn(`Customer not found: ID ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    logger.info(`Retrieved customer: ${customer.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    logger.error(`Error getting customer ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { name } = req.body;
    
    const customer = await Customer.create(req.body);
    
    logger.info(`New customer created: ${name} (ID: ${customer.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    logger.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      logger.warn(`Customer update failed: Customer ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    await customer.update(req.body);
    
    logger.info(`Customer updated: ${customer.name} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    logger.error(`Error updating customer ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      logger.warn(`Customer deletion failed: Customer ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Check if customer has sales orders
    const soCount = await SalesOrder.count({
      where: {
        customer_id: id,
        status: ['pending', 'approved']
      }
    });
    if (soCount > 0) {
      logger.warn(`Customer deletion blocked: Customer ID ${id} has ${soCount} active sales orders`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer. It has ${soCount} pending or approved sales orders.`
      });
    }
    
    const customerName = customer.name;
    await customer.destroy();
    
    logger.info(`Customer deleted: ${customerName} (ID: ${id})`);
    
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting customer ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get active customers
const getActiveCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'contact', 'phone', 'type'],
      order: [['name', 'ASC']]
    });
    
    logger.info(`Retrieved ${customers.length} active customers`);
    
    res.status(200).json({
      success: true,
      data: customers
    });
  } catch (error) {
    logger.error('Error getting active customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export customers to Excel
const exportCustomers = async (req, res) => {
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
    
    // Get customers
    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Format data for export
    const exportData = customers.map(customer => ({
      Name: customer.name,
      Contact: customer.contact,
      Phone: customer.phone,
      Address: customer.address,
      Type: customer.type,
      Status: customer.status
    }));
    
    // Export to Excel
    const filename = `customers_${Date.now()}.xlsx`;
    exportToExcel(exportData, filename);
    
    logger.info(`Exported ${customers.length} customers to Excel`);
    
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
    logger.error('Error exporting customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getActiveCustomers,
  exportCustomers
};
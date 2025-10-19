const { sequelize } = require('../utils/database');
const logger = require('../config/logger');

/**
 * Get dashboard summary statistics
 * Accessible by: admin, staff, viewer
 */
const getDashboardSummary = async (req, res) => {
  try {
    console.log('=== GET DASHBOARD SUMMARY ===');
    console.log('User:', req.user.username, 'Role:', req.user.role);

    // Query for dashboard stats from the v_dashboard view
    const [dashboardData] = await sequelize.query('SELECT * FROM v_dashboard');
    
    // Query for low stock counts
    const [lowStockMaterials] = await sequelize.query('SELECT COUNT(*) as count FROM v_low_stock_materials');
    const [lowStockProducts] = await sequelize.query('SELECT COUNT(*) as count FROM v_low_stock_products');
    
    // Query for recent activity counts
    const [recentPOs] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM purchase_orders 
      WHERE DATE(order_date) = CURDATE()
    `);
    
    const [recentSOs] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM sales_orders 
      WHERE DATE(order_date) = CURDATE()
    `);
    
    const [recentWOs] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM work_orders 
      WHERE DATE(created_at) = CURDATE()
    `);

    const summary = {
      workOrders: {
        active: dashboardData[0]?.active_work_orders || 0,
        pending: 0,
        inProgress: dashboardData[0]?.active_work_orders || 0,
        today: recentWOs[0]?.count || 0
      },
      sales: {
        pending: dashboardData[0]?.pending_sales || 0,
        today: recentSOs[0]?.count || 0
      },
      purchases: {
        pending: dashboardData[0]?.pending_purchases || 0,
        today: recentPOs[0]?.count || 0
      },
      stock: {
        lowMaterials: lowStockMaterials[0]?.count || 0,
        lowProducts: lowStockProducts[0]?.count || 0
      }
    };

    console.log('✓ Dashboard summary retrieved');
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error getting dashboard summary:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard',
      error: error.message
    });
  }
};

/**
 * Get dashboard statistics
 * Accessible by: admin, staff, viewer
 */
const getDashboardStats = async (req, res) => {
  try {
    console.log('=== GET DASHBOARD STATS ===');
    console.log('User:', req.user.username, 'Role:', req.user.role);

    // Get total counts
    const [materialCount] = await sequelize.query('SELECT COUNT(*) as count FROM raw_materials WHERE status = "active"');
    const [productCount] = await sequelize.query('SELECT COUNT(*) as count FROM products WHERE status = "active"');
    const [supplierCount] = await sequelize.query('SELECT COUNT(*) as count FROM suppliers WHERE status = "active"');
    const [customerCount] = await sequelize.query('SELECT COUNT(*) as count FROM customers WHERE status = "active"');
    
    // Get total stock value (approximate)
    const [materialValue] = await sequelize.query('SELECT SUM(stock * unit_price) as value FROM raw_materials WHERE status = "active"');
    const [productValue] = await sequelize.query('SELECT SUM(stock * unit_price) as value FROM products WHERE status = "active"');
    
    const stats = {
      inventory: {
        materials: materialCount[0]?.count || 0,
        products: productCount[0]?.count || 0,
        materialValue: materialValue[0]?.value || 0,
        productValue: productValue[0]?.value || 0
      },
      partners: {
        suppliers: supplierCount[0]?.count || 0,
        customers: customerCount[0]?.count || 0
      }
    };

    console.log('✓ Dashboard stats retrieved');
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik dashboard',
      error: error.message
    });
  }
};

/**
 * Get recent activities
 * Accessible by: admin, staff, viewer
 */
const getRecentActivities = async (req, res) => {
  try {
    console.log('=== GET RECENT ACTIVITIES ===');
    console.log('User:', req.user.username, 'Role:', req.user.role);

    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent stock movements
    const [recentMovements] = await sequelize.query(`
      SELECT 
        sl.*,
        CASE 
          WHEN sl.item_type = 'material' THEN rm.name
          WHEN sl.item_type = 'product' THEN p.name
        END as item_name,
        u.full_name as created_by_name
      FROM stock_logs sl
      LEFT JOIN raw_materials rm ON sl.item_type = 'material' AND sl.item_id = rm.id
      LEFT JOIN products p ON sl.item_type = 'product' AND sl.item_id = p.id
      LEFT JOIN users u ON sl.created_by = u.id
      ORDER BY sl.created_at DESC
      LIMIT ?
    `, {
      replacements: [limit]
    });

    console.log('✓ Recent activities retrieved');
    
    res.json({
      success: true,
      data: recentMovements
    });
  } catch (error) {
    logger.error('Error getting recent activities:', error);
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil aktivitas terbaru',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardSummary,
  getDashboardStats,
  getRecentActivities
};

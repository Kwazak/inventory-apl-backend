console.log('=== LOADING MODELS ===');
const { sequelize } = require('../utils/database');

// Import all models (already initialized with sequelize)
console.log('Loading User model...');
const User = require('./user');
console.log('Loading Supplier model...');
const Supplier = require('./supplier');
console.log('Loading Customer model...');
const Customer = require('./customer');
console.log('Loading Material model...');
const Material = require('./material');
console.log('Loading Product model...');
const Product = require('./product');
console.log('Loading BOM model...');
const BOM = require('./bom');
console.log('Loading PurchaseOrder model...');
const PurchaseOrder = require('./po');
console.log('Loading POItem model...');
const POItem = require('./poItem');
console.log('Loading WorkOrder model...');
const WorkOrder = require('./workOrder');
console.log('Loading SalesOrder model...');
const SalesOrder = require('./sales');
console.log('Loading SOItem model...');
const SOItem = require('./soItem');
console.log('Loading Stock model...');
const Stock = require('./stock');
console.log('✓ All models loaded');

// Collect models
const models = {
  User,
  Supplier,
  Customer,
  Material,
  Product,
  BOM,
  PurchaseOrder,
  POItem,
  WorkOrder,
  SalesOrder,
  SOItem,
  Stock,
};

// Run associate methods if they exist
console.log('=== SETTING UP MODEL ASSOCIATIONS ===');
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    console.log(`Setting up associations for ${modelName}...`);
    models[modelName].associate(models);
  }
});
console.log('✓ All associations configured');

// Define associations (backward compatibility)
// Supplier <-> Material
Supplier.hasMany(Material, { foreignKey: 'supplier_id', as: 'materials' });
Material.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// Product <-> BOM <-> Material
Product.hasMany(BOM, { foreignKey: 'product_id', as: 'bomItems' });
Material.hasMany(BOM, { foreignKey: 'material_id', as: 'bomItems' });
BOM.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
BOM.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

// Purchase Order associations
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplier_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
User.hasMany(PurchaseOrder, { foreignKey: 'created_by', as: 'createdPurchaseOrders' });
PurchaseOrder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// PO Items
PurchaseOrder.hasMany(POItem, { foreignKey: 'po_id', as: 'items' });
POItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
Material.hasMany(POItem, { foreignKey: 'material_id', as: 'poItems' });
POItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

// Work Order associations
Product.hasMany(WorkOrder, { foreignKey: 'product_id', as: 'workOrders' });
WorkOrder.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(WorkOrder, { foreignKey: 'created_by', as: 'createdWorkOrders' });
WorkOrder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Sales Order associations
Customer.hasMany(SalesOrder, { foreignKey: 'customer_id', as: 'salesOrders' });
SalesOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
User.hasMany(SalesOrder, { foreignKey: 'created_by', as: 'createdSalesOrders' });
SalesOrder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// SO Items
SalesOrder.hasMany(SOItem, { foreignKey: 'so_id', as: 'items' });
SOItem.belongsTo(SalesOrder, { foreignKey: 'so_id', as: 'salesOrder' });
Product.hasMany(SOItem, { foreignKey: 'product_id', as: 'soItems' });
SOItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Stock Log associations
User.hasMany(Stock, { foreignKey: 'created_by', as: 'stockLogs' });
Stock.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = {
  sequelize,
  ...models,
  // Backward compatibility exports
  RawMaterial: Material, // Legacy name
  StockLog: Stock, // Legacy name
};

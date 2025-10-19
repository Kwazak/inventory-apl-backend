const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const StockLog = sequelize.define('StockLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_type: {
    type: DataTypes.ENUM('material', 'product'),
    allowNull: false
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  movement_type: {
    type: DataTypes.ENUM('in', 'out', 'adjust'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reference_type: {
    type: DataTypes.STRING(50),
    comment: 'PO, WO, SO, ADJUSTMENT'
  },
  reference_id: {
    type: DataTypes.INTEGER
  },
  notes: {
    type: DataTypes.TEXT
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stock_logs',
  timestamps: false
});

module.exports = StockLog;
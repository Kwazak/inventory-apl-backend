'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      item_type: {
        type: Sequelize.ENUM('material', 'product'),
        allowNull: false,
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      movement_type: {
        type: Sequelize.ENUM('in', 'out', 'adjust'),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'PO, WO, SO, ADJUSTMENT',
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('stock_logs', ['item_type']);
    await queryInterface.addIndex('stock_logs', ['item_id']);
    await queryInterface.addIndex('stock_logs', ['movement_type']);
    await queryInterface.addIndex('stock_logs', ['reference_type', 'reference_id']);
    await queryInterface.addIndex('stock_logs', ['created_by']);
    await queryInterface.addIndex('stock_logs', ['created_at']);
    
    // Composite index for common queries
    await queryInterface.addIndex('stock_logs', ['item_type', 'item_id', 'created_at'], {
      name: 'idx_stock_logs_item_date',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_logs');
  },
};

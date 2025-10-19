'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('products', [
      {
        sku: 'PRD-SENDAL-001',
        name: 'Sandal Pria Casual',
        category: 'Sandal Pria',
        type: 'sendal',
        size: '38-44',
        color: 'Hitam, Coklat',
        unit_price: 75000.00,
        stock: 50,
        min_stock: 20,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        sku: 'PRD-BOOT-001',
        name: 'Sepatu Boot Safety',
        category: 'Boot Safety',
        type: 'boot',
        size: '39-45',
        color: 'Hitam, Coklat Gelap',
        unit_price: 250000.00,
        stock: 30,
        min_stock: 10,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        sku: 'PRD-SENDAL-002',
        name: 'Sandal Wanita Fashion',
        category: 'Sandal Wanita',
        type: 'sendal',
        size: '36-40',
        color: 'Putih, Pink, Biru',
        unit_price: 85000.00,
        stock: 40,
        min_stock: 15,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {});
  }
};

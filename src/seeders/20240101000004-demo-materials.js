'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get supplier IDs
    const suppliers = await queryInterface.sequelize.query(
      'SELECT id, name FROM suppliers ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const kulitSupplier = suppliers.find(s => s.name.includes('Kulit'))?.id || 1;
    const karetSupplier = suppliers.find(s => s.name.includes('Karet'))?.id || 2;
    const materialSupplier = suppliers.find(s => s.name.includes('Material'))?.id || 3;

    await queryInterface.bulkInsert('raw_materials', [
      {
        sku: 'RM-KULIT-001',
        name: 'Kulit Sintetis Grade A',
        category: 'Kulit',
        unit: 'meter',
        stock: 150,
        min_stock: 50,
        unit_price: 125000.00,
        supplier_id: kulitSupplier,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        sku: 'RM-KARET-001',
        name: 'Karet Sol Sandal',
        category: 'Karet',
        unit: 'kg',
        stock: 200,
        min_stock: 75,
        unit_price: 45000.00,
        supplier_id: karetSupplier,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        sku: 'RM-BENANG-001',
        name: 'Benang Jahit Nylon',
        category: 'Aksesori',
        unit: 'roll',
        stock: 500,
        min_stock: 100,
        unit_price: 15000.00,
        supplier_id: materialSupplier,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        sku: 'RM-LEM-001',
        name: 'Lem Sepatu Industrial',
        category: 'Bahan Kimia',
        unit: 'liter',
        stock: 80,
        min_stock: 20,
        unit_price: 85000.00,
        supplier_id: materialSupplier,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('raw_materials', null, {});
  }
};

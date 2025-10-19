'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get product IDs
    const products = await queryInterface.sequelize.query(
      'SELECT id, sku FROM products ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Get material IDs
    const materials = await queryInterface.sequelize.query(
      'SELECT id, sku FROM raw_materials ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const sandalPria = products.find(p => p.sku === 'PRD-SENDAL-001')?.id;
    const boot = products.find(p => p.sku === 'PRD-BOOT-001')?.id;
    const sandalWanita = products.find(p => p.sku === 'PRD-SENDAL-002')?.id;

    const kulit = materials.find(m => m.sku === 'RM-KULIT-001')?.id;
    const karet = materials.find(m => m.sku === 'RM-KARET-001')?.id;
    const benang = materials.find(m => m.sku === 'RM-BENANG-001')?.id;
    const lem = materials.find(m => m.sku === 'RM-LEM-001')?.id;

    await queryInterface.bulkInsert('bom', [
      // BOM untuk Sandal Pria Casual
      {
        product_id: sandalPria,
        material_id: kulit,
        quantity: 0.15,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: sandalPria,
        material_id: karet,
        quantity: 0.25,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: sandalPria,
        material_id: benang,
        quantity: 0.02,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: sandalPria,
        material_id: lem,
        quantity: 0.05,
        created_at: new Date(),
        updated_at: new Date()
      },

      // BOM untuk Sepatu Boot Safety
      {
        product_id: boot,
        material_id: kulit,
        quantity: 0.45,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: boot,
        material_id: karet,
        quantity: 0.50,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: boot,
        material_id: benang,
        quantity: 0.05,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: boot,
        material_id: lem,
        quantity: 0.12,
        created_at: new Date(),
        updated_at: new Date()
      },

      // BOM untuk Sandal Wanita Fashion
      {
        product_id: sandalWanita,
        material_id: kulit,
        quantity: 0.12,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: sandalWanita,
        material_id: karet,
        quantity: 0.20,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: sandalWanita,
        material_id: benang,
        quantity: 0.02,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        product_id: sandalWanita,
        material_id: lem,
        quantity: 0.04,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('bom', null, {});
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('customers', [
      {
        name: 'Toko Sepatu Maju',
        contact: 'Hendra Gunawan',
        phone: '021-33445566',
        address: 'Jl. Tanah Abang No. 23, Jakarta Pusat',
        type: 'wholesale',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'CV Distribusi Sejahtera',
        contact: 'Linda Kusuma',
        phone: '022-66778899',
        address: 'Jl. Cihampelas No. 45, Bandung',
        type: 'wholesale',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Retail Customer - Walk In',
        contact: 'General',
        phone: '021-00000000',
        address: 'Factory Outlet',
        type: 'retail',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('customers', null, {});
  }
};

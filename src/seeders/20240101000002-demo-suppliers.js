'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('suppliers', [
      {
        name: 'PT Kulit Indonesia',
        contact: 'Budi Santoso - 021-55551234',
        phone: '021-55551234',
        address: 'Jl. Industri No. 45, Jakarta Timur',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'CV Karet Jaya',
        contact: 'Siti Rahayu - 031-77889900',
        phone: '031-77889900',
        address: 'Jl. Raya Surabaya No. 12, Sidoarjo',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Toko Material Lengkap',
        contact: 'Ahmad Wijaya - 024-88990011',
        phone: '024-88990011',
        address: 'Jl. Pasar Besar No. 88, Semarang',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('suppliers', null, {});
  }
};

'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@factory.com',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'operator1',
        email: 'operator1@factory.com',
        password: hashedPassword,
        full_name: 'Operator Produksi',
        role: 'staff',
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'manager',
        email: 'manager@factory.com',
        password: hashedPassword,
        full_name: 'Production Manager',
        role: 'manager',
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};

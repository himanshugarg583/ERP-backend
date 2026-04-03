'use strict';

const path = require('path');
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const projectRoot = path.resolve(__dirname, '..');

    // Load model definitions and associations, then create any missing tables.
    const { sequelize } = require(path.join(projectRoot, 'models'));
    await sequelize.sync();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@erp.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const [existingAdmin] = await queryInterface.sequelize.query(
      'SELECT id FROM Users WHERE email = :email LIMIT 1',
      {
        replacements: { email: adminEmail },
      }
    );

    if (!existingAdmin.length) {
      await queryInterface.bulkInsert('Users', [
        {
          name: 'Admin',
          email: adminEmail,
          password: passwordHash,
          role: 'admin',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@erp.local';

    await queryInterface.bulkDelete('Users', {
      email: adminEmail,
      role: 'admin',
    });
  },
};

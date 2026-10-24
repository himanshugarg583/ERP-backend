'use strict';

const path = require('path');

module.exports = {
  async up() {
    const projectRoot = path.resolve(__dirname, '..');
    const { sequelize } = require(path.join(projectRoot, 'models'));

    // Create any tables for newly registered models.
    await sequelize.sync();
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admission_enquiries');
  },
};

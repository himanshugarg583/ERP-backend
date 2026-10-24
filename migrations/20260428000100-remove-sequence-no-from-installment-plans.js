'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('installment_plans', 'sequence_no');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('installment_plans', 'sequence_no', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  }
};

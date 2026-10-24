'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('student_fee_assignments');

    if (table.effective_from) {
      await queryInterface.removeColumn('student_fee_assignments', 'effective_from');
    }

    if (table.effective_to) {
      await queryInterface.removeColumn('student_fee_assignments', 'effective_to');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('student_fee_assignments');

    if (!table.effective_from) {
      await queryInterface.addColumn('student_fee_assignments', 'effective_from', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });
    }

    if (!table.effective_to) {
      await queryInterface.addColumn('student_fee_assignments', 'effective_to', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });
    }
  }
};

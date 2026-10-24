'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('student_fee_assignments', 'assignment_type');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_fee_assignments', 'assignment_type', {
      type: Sequelize.ENUM('recurring', 'one_time'),
      allowNull: false,
      defaultValue: 'recurring'
    });
  }
};

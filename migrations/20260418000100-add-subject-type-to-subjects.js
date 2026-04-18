'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subjects', 'subject_type', {
      type: Sequelize.ENUM('theory', 'practical', 'extra_caricualam_activity'),
      allowNull: false,
      defaultValue: 'theory'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subjects', 'subject_type');
  }
};

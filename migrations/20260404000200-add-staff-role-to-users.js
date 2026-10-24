'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM(
        'admin',
        'teacher',
        'student',
        'accountant',
        'staff',
        'hr',
        'librarian',
        'admission_officer',
        'transport_manager',
        'hostel_warden'
      ),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('admin', 'teacher', 'student', 'accountant', 'staff'),
      allowNull: false
    });
  }
};

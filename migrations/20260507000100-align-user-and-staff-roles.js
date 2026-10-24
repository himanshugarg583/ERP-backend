'use strict';

const STAFF_ROLES = ['staff', 'accountant', 'hr', 'librarian', 'admission_officer', 'transport_manager', 'hostel_warden'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const staffTable = await queryInterface.describeTable('staff');
      const usersTable = await queryInterface.describeTable('users');

      if (staffTable.department && !staffTable.role) {
        await queryInterface.renameColumn('staff', 'department', 'role', { transaction });
      }

      if (usersTable.role) {
        await queryInterface.changeColumn(
          'users',
          'role',
          {
            type: Sequelize.ENUM('admin', 'teacher', 'student', 'accountant', 'staff', 'hr', 'librarian', 'admission_officer', 'transport_manager', 'hostel_warden'),
            allowNull: false,
          },
          { transaction }
        );
      }

      if (staffTable.department || staffTable.role) {
        await queryInterface.changeColumn(
          'staff',
          'role',
          {
            type: Sequelize.ENUM('staff', 'accountant', 'hr', 'librarian', 'admission_officer', 'transport_manager', 'hostel_warden'),
            allowNull: false,
            defaultValue: 'staff',
          },
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE users u
         INNER JOIN staff s ON s.user_id = u.id
         SET u.role = CASE
           WHEN s.role IN ('staff', 'accountant', 'hr', 'librarian', 'admission_officer', 'transport_manager', 'hostel_warden') THEN s.role
           ELSE 'staff'
         END
         WHERE u.role = 'staff' OR u.role IS NULL`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE staff
         SET role = 'staff'
         WHERE role IS NULL OR role = 'non_teaching_staff' OR role = 'other'`,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const staffTable = await queryInterface.describeTable('staff');
      const usersTable = await queryInterface.describeTable('users');

      if (usersTable.role) {
        await queryInterface.sequelize.query(
          `UPDATE users u
           INNER JOIN staff s ON s.user_id = u.id
           SET u.role = CASE
             WHEN s.role = 'accountant' THEN 'accountant'
             WHEN s.role = 'teacher' THEN 'teacher'
             WHEN s.role = 'student' THEN 'student'
             ELSE 'staff'
           END`,
          { transaction }
        );

        await queryInterface.changeColumn(
          'users',
          'role',
          {
            type: Sequelize.ENUM('admin', 'teacher', 'student', 'accountant', 'staff'),
            allowNull: false,
          },
          { transaction }
        );
      }

      if (staffTable.role && !staffTable.department) {
        await queryInterface.renameColumn('staff', 'role', 'department', { transaction });
      }

      if (staffTable.role || staffTable.department) {
        await queryInterface.sequelize.query(
          `UPDATE staff
           SET department = CASE
             WHEN department IN ('hr', 'librarian', 'admission_officer', 'transport_manager', 'hostel_warden') THEN department
             ELSE 'non_teaching_staff'
           END`,
          { transaction }
        );

        await queryInterface.changeColumn(
          'staff',
          'department',
          {
            type: Sequelize.ENUM('hr', 'librarian', 'admission_officer', 'transport_manager', 'hostel_warden', 'non_teaching_staff', 'other'),
            allowNull: false,
            defaultValue: 'non_teaching_staff',
          },
          { transaction }
        );
      }
    });
  },
};
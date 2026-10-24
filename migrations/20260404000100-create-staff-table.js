'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      employee_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },
      role: {
        type: Sequelize.ENUM(
          'staff',
          'accountant',
          'hr',
          'librarian',
          'admission_officer',
          'transport_manager',
          'hostel_warden'
        ),
        allowNull: false,
        defaultValue: 'staff'
      },
      designation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      dob: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      mobile_no: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      qualification: {
        type: Sequelize.STRING,
        allowNull: true
      },
      joining_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      salary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      current_address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      permanent_address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff');
  }
};

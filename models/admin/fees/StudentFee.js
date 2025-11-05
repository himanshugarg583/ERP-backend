const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const StudentFee = sequelize.define('StudentFee', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    fee_structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fee_structures',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    academic_year: {
      type: DataTypes.STRING(9),
      allowNull: false,
    },
    original_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    discount_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    final_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    due_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'waived'),
      defaultValue: 'pending',
    },
  }, {
    tableName: 'student_fees',
    timestamps: true,
    underscored: true,
  });

  module.exports = { StudentFee };

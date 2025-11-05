const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

  const FeeInstallment = sequelize.define('FeeInstallment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_fee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'student_fees',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    installment_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    late_fee_applied: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    late_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Calculated late fee based on due date',
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue', 'waived'),
      defaultValue: 'pending',
    },
  }, {
    tableName: 'fee_installments',
    timestamps: true,
    underscored: true,
  });

  module.exports = {FeeInstallment};


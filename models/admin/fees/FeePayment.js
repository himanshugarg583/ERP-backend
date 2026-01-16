const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeePayment = sequelize.define('FeePayment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'students',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    academic_year: {
      type: DataTypes.STRING(9),
      allowNull: false,
      comment: 'e.g., 2024-2025',
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    late_fee_paid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    total_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'amount_paid + late_fee_paid',
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'cheque', 'online', 'card', 'upi', 'bank_transfer'),
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'For online/card payments',
    },
    cheque_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'For cheque payments',
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Bank name for cheque/transfer',
    },
    receipt_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'System generated receipt number',
    },
    payment_type: {
      type: DataTypes.ENUM('fee', 'fine', 'other'),
      defaultValue: 'fee',
      comment: 'Type of payment',
    },
   
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM('success', 'pending', 'failed', 'cancelled'),
      defaultValue: 'success',
    },
    is_refund: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True if this is a refund record',
    },
    refund_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  }, {
    tableName: 'fee_payments',
    timestamps: true,
    underscored: true,
  });

module.exports = {FeePayment};


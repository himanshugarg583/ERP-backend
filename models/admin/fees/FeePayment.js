const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeePayment = sequelize.define('FeePayment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  student_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'students',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },

  installment_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // kept flexible, no FK constraint
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  payment_mode: {
    type: DataTypes.ENUM('cash', 'online', 'cheque', 'bank_transfer'),
    allowNull: false,
  },

  transaction_ref: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM('success', 'failed', 'pending'),
    allowNull: false,
    defaultValue: 'pending',
  },

  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  receiver_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

}, {
  tableName: 'fee_payments',
  timestamps: false,
});

module.exports = {FeePayment};

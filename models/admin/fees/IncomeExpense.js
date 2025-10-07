const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const IncomeExpense = sequelize.define('IncomeExpense', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  entry_type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false,
  },

  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },

  sub_category: {
    type: DataTypes.STRING(100),
    allowNull: true,
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

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  entry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  recorded_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

}, {
  tableName: 'income_expense',
  timestamps: false,
});

module.exports = {IncomeExpense};

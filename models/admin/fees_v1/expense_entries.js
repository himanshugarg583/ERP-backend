const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ExpenseEntryV1 = sequelize.define('ExpenseEntryV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  academic_year_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'academic_years',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  vendor_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'),
    allowNull: false,
    defaultValue: 'cash'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  entry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'expense_entries',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { ExpenseEntryV1 };

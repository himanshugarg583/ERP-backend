const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const IncomeEntryV1 = sequelize.define('IncomeEntryV1', {
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
  fee_payment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'fee_payments',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'fee_collection'
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true
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
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'income_entries',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { IncomeEntryV1 };

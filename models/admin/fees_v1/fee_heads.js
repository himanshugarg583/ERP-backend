const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeHeadV1 = sequelize.define('FeeHeadV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.ENUM('academic', 'facility', 'transport', 'hostel', 'exam', 'other'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_optional: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_refundable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  ledger_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'fee_heads',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeHeadV1 };

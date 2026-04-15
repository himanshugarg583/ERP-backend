const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ConcessionV1 = sequelize.define('ConcessionV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('percentage', 'flat_amount', 'full_waiver'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },
  applies_to: {
    type: DataTypes.ENUM('all_heads', 'specific_head', 'total_invoice'),
    allowNull: false
  },
  requires_approval: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  valid_from: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'concessions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { ConcessionV1 };

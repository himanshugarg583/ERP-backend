const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeStructureItemV1 = sequelize.define('FeeStructureItemV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fee_structure_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_structures',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  fee_head_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_heads',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'fee_structure_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeStructureItemV1 };

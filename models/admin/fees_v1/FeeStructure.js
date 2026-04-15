const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeStructureV1 = sequelize.define('FeeStructureV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  academic_year_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  applicable_to: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  class_ids: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  structure_type: {
    type: DataTypes.ENUM('recurring', 'one_time'),
    allowNull: false,
    defaultValue: 'recurring'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'fee_structures',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeStructureV1 };

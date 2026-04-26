const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeStructureV1 = sequelize.define('FeeStructureV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  academic_year_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'academic_years',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'class_sections',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
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
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  }
}, {
  tableName: 'fee_structures',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeStructureV1 };

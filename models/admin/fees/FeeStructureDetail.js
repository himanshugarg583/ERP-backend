const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

  const FeeStructureDetail = sequelize.define('FeeStructureDetail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fee_structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fee_structures',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    fee_head_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fee_head',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    is_mandatory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sequence_order: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  }, {
    tableName: 'fee_structure_details',
    timestamps: true,
    underscored: true,
  });

  module.exports = {FeeStructureDetail};  

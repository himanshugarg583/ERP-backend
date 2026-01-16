const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

  const FeeStructure = sequelize.define('FeeStructure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    class_section_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'class_sections', // refers to table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    academic_start_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academic_end_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    late_fee_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    late_fee_type: {
      type: DataTypes.ENUM('flat', 'percentage'),
      defaultValue: 'flat',
    },
   
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  }, {
    tableName: 'fee_structures',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  module.exports = {FeeStructure};  


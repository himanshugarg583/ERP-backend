const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const InstallmentPlanV1 = sequelize.define('InstallmentPlanV1', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  installment_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  allow_partial_payment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fixed_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  late_fine_type: {
    type: DataTypes.ENUM('per_day', 'flat', 'none'),
    allowNull: false,
    defaultValue: 'none'
  },
  late_fine_value: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },

}, {
  tableName: 'installment_plans',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { InstallmentPlanV1 };

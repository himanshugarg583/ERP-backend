const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const InstallmentPlanV1 = sequelize.define('InstallmentPlanV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fee_structure_id: {
    type: DataTypes.UUID,
    allowNull: false
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
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
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
  max_late_fine: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  grace_period_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'installment_plans',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { InstallmentPlanV1 };

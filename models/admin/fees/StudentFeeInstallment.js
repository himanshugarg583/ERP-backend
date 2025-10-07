const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const StudentFeeInstallment = sequelize.define('StudentFeeInstallment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  student_fee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'student_fees',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  installment_no: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // 👇 Newly added field
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  paid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },

  status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    allowNull: false,
    defaultValue: 'unpaid',
  },

  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

}, {
  tableName: 'student_fee_installments',
  timestamps: false,
});

module.exports = {StudentFeeInstallment};

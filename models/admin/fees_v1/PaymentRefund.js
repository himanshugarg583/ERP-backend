const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const PaymentRefundV1 = sequelize.define('PaymentRefundV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  payment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  refund_mode: {
    type: DataTypes.ENUM('cash', 'bank_transfer', 'gateway_reversal'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'processed', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  gateway_refund_id: {
    type: DataTypes.STRING(150),
    allowNull: true
  }
}, {
  tableName: 'payment_refunds',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { PaymentRefundV1 };

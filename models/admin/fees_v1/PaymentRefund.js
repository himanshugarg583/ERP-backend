const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const PaymentRefundV1 = sequelize.define('PaymentRefundV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  payment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_payments',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
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
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
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

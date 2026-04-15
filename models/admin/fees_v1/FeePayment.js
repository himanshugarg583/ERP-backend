const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeePaymentV1 = sequelize.define('FeePaymentV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  receipt_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  fine_paid: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'upi', 'card', 'netbanking', 'cheque', 'dd', 'neft', 'online'),
    allowNull: false
  },
  transaction_ref: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payment_gateway: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  gateway_payment_id: {
    type: DataTypes.STRING(150),
    allowNull: true,
    unique: true
  },
  collected_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  cheque_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  cheque_bank: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  cheque_status: {
    type: DataTypes.ENUM('pending', 'cleared', 'bounced'),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_cancelled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  cancelled_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'fee_payments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeePaymentV1 };

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeePaymentV1 = sequelize.define('FeePaymentV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  receipt_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  receipt_no: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_invoices',
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
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'reversed', 'cancelled'),
    allowNull: false,
    defaultValue: 'success'
  },
  is_partial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
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
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
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

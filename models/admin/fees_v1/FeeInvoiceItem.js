const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeInvoiceItemV1 = sequelize.define('FeeInvoiceItemV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fee_head_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  gross_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  concession_amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },
  net_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'fee_invoice_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeInvoiceItemV1 };

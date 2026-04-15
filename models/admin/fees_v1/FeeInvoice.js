const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeInvoiceV1 = sequelize.define('FeeInvoiceV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assignment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  installment_plan_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  academic_year_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  gross_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  concession_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  net_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  fine_amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },
  paid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  balance_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'partial', 'paid', 'overdue', 'waived', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  waived_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  waiver_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'fee_invoices',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeInvoiceV1 };

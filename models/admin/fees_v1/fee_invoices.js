const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeInvoiceV1 = sequelize.define('FeeInvoiceV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  invoice_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  invoice_no: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true
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
  assignment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'student_fee_assignments',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  installment_plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'installment_plans',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
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
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  source_type: {
    type: DataTypes.ENUM('system', 'manual', 'import', 'online'),
    allowNull: false,
    defaultValue: 'system'
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  waived_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
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

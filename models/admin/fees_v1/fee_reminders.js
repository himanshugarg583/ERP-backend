const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeReminderV1 = sequelize.define('FeeReminderV1', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_invoices',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  recipient_number: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  channel: {
    type: DataTypes.ENUM('sms', 'whatsapp', 'email', 'app_push'),
    allowNull: false,
    defaultValue: 'email'
  },
  reminder_type: {
    type: DataTypes.ENUM('due_soon', 'overdue', 'receipt', 'bounce_alert', 'concession_status'),
    allowNull: false
  },
  message_template: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'failed', 'bounced'),
    allowNull: false,
    defaultValue: 'sent'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'fee_reminders',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeReminderV1 };

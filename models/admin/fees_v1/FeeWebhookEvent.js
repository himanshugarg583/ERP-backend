const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeWebhookEventV1 = sequelize.define('FeeWebhookEventV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  gateway: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  event_id: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  event_type: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false
  },
  signature: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('processed', 'ignored', 'rejected', 'failed'),
    allowNull: false,
    defaultValue: 'processed'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'fee_webhook_events',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeWebhookEventV1 };

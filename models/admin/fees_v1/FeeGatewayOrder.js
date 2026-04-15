const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeGatewayOrderV1 = sequelize.define('FeeGatewayOrderV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gateway: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'razorpay'
  },
  gateway_order_id: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'paid', 'expired', 'failed'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'fee_gateway_orders',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeGatewayOrderV1 };

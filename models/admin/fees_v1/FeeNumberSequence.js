const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const FeeNumberSequenceV1 = sequelize.define('FeeNumberSequenceV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  last_value: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'fee_number_sequences',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { FeeNumberSequenceV1 };

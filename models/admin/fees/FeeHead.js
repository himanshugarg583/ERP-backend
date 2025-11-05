const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

  const FeeHead = sequelize.define('FeeHead', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_mandatory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
  }, {
    tableName: 'fee_head',
    timestamps: true,
    underscored: true, // uses created_at and updated_at columns
  });

  module.exports = {FeeHead};

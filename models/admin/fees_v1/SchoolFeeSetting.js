const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const SchoolFeeSettingV1 = sequelize.define('SchoolFeeSettingV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  block_report_card_on_dues: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  fine_first: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  due_date_shift: {
    type: DataTypes.ENUM('next_working_day', 'no_shift', 'prev_working_day'),
    allowNull: false,
    defaultValue: 'no_shift'
  },
  dnd_start_time: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '21:00'
  },
  dnd_end_time: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '08:00'
  }
}, {
  tableName: 'school_fee_settings',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { SchoolFeeSettingV1 };

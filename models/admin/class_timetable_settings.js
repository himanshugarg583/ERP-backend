const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ClassTimetableSetting = sequelize.define('ClassTimetableSetting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  class_section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'class_sections',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  period_duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  break_duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  break_after_period: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  working_days: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'class_timetable_settings',
  timestamps: false,
  underscored: true
});

module.exports = { ClassTimetableSetting };

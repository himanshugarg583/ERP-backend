const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ClassTimeSlot = sequelize.define('ClassTimeSlot', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  class_section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'class_sections',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  slot_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  slot_label: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  is_break: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  tableName: 'class_time_slots',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['class_section_id', 'slot_number'],
      name: 'uq_class_slot_number'
    }
  ]
});

module.exports = { ClassTimeSlot };

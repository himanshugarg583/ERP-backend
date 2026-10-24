const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ClassSection = sequelize.define('ClassSection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  class_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  section_name: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
   room_No: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  teacher_id: {
  type: DataTypes.INTEGER,
  references: {
    model: 'teachers',
    key: 'id'
  },
  onDelete: 'SET NULL',
  allowNull: true
}
}, {
  tableName: 'class_sections',
  timestamps: false
});

module.exports = {ClassSection};

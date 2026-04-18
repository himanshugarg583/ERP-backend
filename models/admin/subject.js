const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  subject_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject_code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  subject_type: {
    type: DataTypes.ENUM('theory', 'practical', 'extra_caricualam_activity'),
    allowNull: false,
    defaultValue: 'theory'
  },
  class_section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'class_sections',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
     references: {
      model: 'teachers', 
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL' 
  }
}, {
  tableName: 'subjects',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = {Subject};

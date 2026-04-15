const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ExamEventV2 = sequelize.define('ExamEventV2', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  exam_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  academic_year: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'ongoing', 'completed', 'published'),
    allowNull: false,
    defaultValue: 'draft'
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  marks_entry_deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  result_publish_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'exam_events',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { ExamEventV2 };

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ResultV2 = sequelize.define('ResultV2', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  exam_event_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_marks: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },
  max_marks: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  grade: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'N/A'
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_pass: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  computed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'suppressed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'results',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'exam_event_id'],
      name: 'uq_result_student_event'
    },
    {
      fields: ['exam_event_id', 'status'],
      name: 'idx_result_event_status'
    }
  ]
});

module.exports = { ResultV2 };

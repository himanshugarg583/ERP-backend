const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ExamPaperV2 = sequelize.define('ExamPaperV2', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  exam_event_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  max_marks: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false
  },
  passing_marks: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false
  },
  marks_config: {
    type: DataTypes.JSON,
    allowNull: false
  },
  assigned_teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'exam_papers',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['exam_event_id', 'subject_id', 'class_id'],
      name: 'uq_exam_paper_event_subject_class'
    }
  ]
});

module.exports = { ExamPaperV2 };

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { ExamSchedule } = require('../exam/examSchedule');
const { Student } = require('../Student');
const { Subject } = require('../subject');

const ExamMark = sequelize.define('ExamMark', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  exam_schedule_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ExamSchedule,
      key: 'id',
    },
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Student,
      key: 'id',
    },
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Subject,
      key: 'id',
    },
  },
  marks_obtained: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 0,
  },
  grade: {
    type: DataTypes.STRING(5),
  },
  remarks: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName: 'exam_marks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = {ExamMark};

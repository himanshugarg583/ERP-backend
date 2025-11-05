const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { Exam } = require('../../admin/exam/exam');
const { ClassSection } = require('../../admin/Classsection');

const ExamSchedule = sequelize.define('ExamSchedule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  exam_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Exam,
      key: 'id',
    },
  },
  class_section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ClassSection,
      key: 'id',
    },
  },
  total_marks: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 100,
  },
  passing_marks: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 33,
  },
  remarks: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'exam_schedules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = {ExamSchedule};

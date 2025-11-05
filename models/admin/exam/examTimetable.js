const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { ExamSchedule } = require('../exam/examSchedule');
const { Subject } = require('../subject');
const { Teacher } = require('../Teacher');

const ExamTimetable = sequelize.define('ExamTimetable', {
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
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Subject,
      key: 'id',
    },
  },
  exam_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.TIME,
  },
  end_time: {
    type: DataTypes.TIME,
  },
  max_marks: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 100,
  },
  passing_marks: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 33,
  },
  invigilator_teacher_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Teacher,
      key: 'id',
    },
  },
  room_no: {
    type: DataTypes.STRING(50),
  },
}, {
  tableName: 'exam_timetables',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = {ExamTimetable};

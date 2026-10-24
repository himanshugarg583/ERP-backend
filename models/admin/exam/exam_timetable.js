const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ExamTimetableV2 = sequelize.define('ExamTimetableV2', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  exam_event_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  exam_paper_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  exam_date: {
    type: DataTypes.DATEONLY,
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
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  slot_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  room_label: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  invigilator_teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_rescheduled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  original_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'exam_timetable',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['exam_event_id', 'class_id', 'exam_date'],
      name: 'idx_exam_timetable_event_class_date'
    }
  ]
});

module.exports = { ExamTimetableV2 };

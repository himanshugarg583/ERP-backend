const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');
const { ExamTerm } = require('../../admin/exam/examTerm');

const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  term_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ExamTerm,
      key: 'id',
    },
  },
  exam_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  start_date: {
    type: DataTypes.DATEONLY,
  },
  end_date: {
    type: DataTypes.DATEONLY,
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'ongoing', 'completed'),
    defaultValue: 'scheduled',
  },
}, {
  tableName: 'exams',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = {Exam};

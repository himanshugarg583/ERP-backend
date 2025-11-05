const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ExamTerm = sequelize.define('ExamTerm', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  term_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  academic_year: {
    type: DataTypes.STRING(9),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
  },
  end_date: {
    type: DataTypes.DATEONLY,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'exam_terms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = {ExamTerm};

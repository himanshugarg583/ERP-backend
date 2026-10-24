const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const MarksEntryV2 = sequelize.define('MarksEntryV2', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  exam_paper_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  result_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  marks: {
    type: DataTypes.JSON,
    allowNull: true
  },
  marks_obtained: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  total_marks: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  max_marks: {
    type: DataTypes.DECIMAL(6, 2),
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
  is_pass: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_absent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_exempt: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  entered_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  entered_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  meta_data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'marks_entries',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['exam_paper_id', 'student_id'],
      name: 'uq_marks_entry_paper_student'
    },
    {
      fields: ['exam_paper_id'],
      name: 'idx_marks_entry_paper'
    },
    {
      fields: ['result_id'],
      name: 'idx_marks_entry_result'
    }
  ]
});

module.exports = { MarksEntryV2 };

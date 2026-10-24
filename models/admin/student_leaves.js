const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const StudentLeave = sequelize.define('StudentLeave', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  leave_type: {
    type: DataTypes.ENUM('sick', 'casual', 'emergency', 'other'),
    allowNull: false,
    defaultValue: 'casual'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachment: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to medical certificate or other supporting document'
  }
}, {
  sequelize,
  tableName: 'student_leaves',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['student_id'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] },
    { fields: ['status'] },
    { fields: ['student_id', 'start_date', 'end_date'] }
  ]
});

module.exports = { StudentLeave };

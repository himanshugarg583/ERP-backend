const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const StudentConcessionV1 = sequelize.define('StudentConcessionV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  concession_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fee_head_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  academic_year_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'student_concessions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { StudentConcessionV1 };

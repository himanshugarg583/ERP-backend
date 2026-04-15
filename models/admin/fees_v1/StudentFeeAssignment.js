const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const StudentFeeAssignmentV1 = sequelize.define('StudentFeeAssignmentV1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fee_structure_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  academic_year_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assignment_type: {
    type: DataTypes.ENUM('recurring', 'one_time'),
    allowNull: false,
    defaultValue: 'recurring'
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  custom_items: {
    type: DataTypes.JSON,
    allowNull: true
  },
  excluded_heads: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'transferred', 'archived'),
    allowNull: false,
    defaultValue: 'active'
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'student_fee_assignments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { StudentFeeAssignmentV1 };

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const DocumentV2 = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  document_type: {
    type: DataTypes.ENUM('admit_card', 'report_card', 'marksheet', 'tc', 'timetable_pdf'),
    allowNull: false
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'final'),
    allowNull: false,
    defaultValue: 'draft'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  meta_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  generated_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  is_valid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'documents',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['student_id', 'document_type', 'reference_id'],
      name: 'idx_document_student_type_reference'
    },
    {
      fields: ['reference_id', 'document_type'],
      name: 'idx_document_reference_type'
    }
  ]
});

module.exports = { DocumentV2 };
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const DocumentTemplateV2 = sequelize.define('DocumentTemplateV2', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  document_type: {
    type: DataTypes.ENUM('admit_card', 'report_card', 'marksheet', 'tc', 'timetable_pdf'),
    allowNull: false
  },
  template_config: {
    type: DataTypes.JSON,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'document_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = { DocumentTemplateV2 };

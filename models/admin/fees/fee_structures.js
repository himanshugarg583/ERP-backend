const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');   // adjust path as per your project

const fee_structures = sequelize.define('fee_structures', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  // 🔹 Can be NULL for general/common fee structures
  class_section_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'class_sections',  // name of referenced table
      key: 'id'
    },
    onDelete: 'SET NULL'
  },

  // 🔹 Academic year can also be null (for general fee)
  academic_year: {
    type: DataTypes.STRING(10),
    allowNull: true
  },

  // 🔹 Fee structure name (required)
  fee_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. Annual Fee, Term Fee, Admission Fee'
  },

  // 🔹 Fee Heads (3 heads for simplicity)
  head1_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  head1_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },

  head2_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  head2_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },

  head3_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  head3_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },

  // 🔹 Total amount of this fee structure
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },

  // 🔹 Timestamps handled automatically
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'fee_structures',
  timestamps: false,   // since we're manually handling timestamps
});

module.exports = {fee_structures};

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');  // adjust the path as per your project

const StudentFee = sequelize.define('StudentFee', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // 🔹 Student linked with this fee
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students', // referenced table name
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  // 🔹 Linked fee structure (class-based fee plan)
  fee_structure_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_structures', // referenced table name
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  // 🔹 Discount (if any)
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },

  // 🔹 Payment status
  status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    allowNull: false,
    defaultValue: 'unpaid',
  },

  // 🔹 Timestamps
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'student_fees',
  timestamps: false, // we're manually managing timestamps
});

module.exports = {StudentFee};

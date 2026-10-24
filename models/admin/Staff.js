const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Staff = sequelize.define('Staff', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  employee_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  role: {
    type: DataTypes.ENUM(
      'staff',
      'accountant',
      'hr',
      'librarian',
      'admission_officer',
      'transport_manager',
      'hostel_warden'
    ),
    allowNull: false,
    defaultValue: 'staff'
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  mobile_no: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  qualification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  joining_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  current_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permanent_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'staff',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = { Staff };

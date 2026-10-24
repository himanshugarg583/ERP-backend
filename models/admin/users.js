const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
  name: { 
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  email: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false,
    
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false,
    
  },
  role: {
    type: DataTypes.ENUM(
      'admin',
      'teacher',
      'student',
      'accountant',
      'staff',
      'hr',
      'librarian',
      'admission_officer',
      'transport_manager',
      'hostel_warden'
    ),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    defaultValue: "active",
  }
}, {
  tableName: 'users',
  timestamps: true,  
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = {User};

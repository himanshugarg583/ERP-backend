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
    type: DataTypes.ENUM('admin', 'teacher', 'student','accountant'),
    allowNull: false,
    
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    defaultValue: "active",
  }
}, {
  tableName: 'Users',
  timestamps: true,  
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = {User};

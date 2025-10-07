const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Teacher = sequelize.define('Teacher', {
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
  },
  qualification: {
    type: DataTypes.STRING
  },
  dob: {
    type: DataTypes.DATEONLY
  },
   mobile_no: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
  
  
    permanent_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
        role: {
      type: DataTypes.ENUM("teacher", "staff","librarian","accontant"),
      defaultValue: "teacher",
    },
    gender: {
    type: DataTypes.STRING
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2)
  },
  joining_date: {
    type: DataTypes.DATEONLY
  },
  current_address: {
    type: DataTypes.STRING
  },
  

  image: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'teachers',
  timestamps: true
});




module.exports = {Teacher};

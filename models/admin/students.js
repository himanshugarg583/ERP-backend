const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  admission_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
  },
  roll_number: {
    type: DataTypes.STRING(20)
  },
  dob: {
    type: DataTypes.DATEONLY
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other')
  },
  address: {
    type: DataTypes.TEXT
  },
  admission_date: {
    type: DataTypes.DATE
  },
  class_section_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'class_sections',
      key: 'id'
    }
  },
   phone_no: {
      type: DataTypes.STRING,
      allowNull: true
    },
    previous_school_name: {
      type: DataTypes.STRING,
      allowNull: true
    },  
     aadhar_no: {
      type: DataTypes.STRING(16),
      allowNull: true,         
      unique: true             
    },
  tc: {
    type: DataTypes.STRING
  },
  marksheet: {
    type: DataTypes.STRING
  },
  image: {
    type: DataTypes.STRING
  },
  aadhar_card: {
    type: DataTypes.STRING
  },
  sign: {
    type: DataTypes.STRING
  }


}, {
  tableName: 'students',
  timestamps: false
});

module.exports = {Student};

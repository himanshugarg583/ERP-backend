const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Student = require('./Student');
// const ClassSection = require('./Classsection');


  const StudentParent = sequelize.define('StudentParent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    father_name: {
      type: DataTypes.STRING
    },
    father_phone: {
      type: DataTypes.STRING
    },
    father_occupation: {
      type: DataTypes.STRING
    },
    mother_name: {
      type: DataTypes.STRING
    },
    mother_phone: {
      type: DataTypes.STRING
    },
    mother_occupation: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'student_parents',
    timestamps: false
  });



  module.exports = {StudentParent}
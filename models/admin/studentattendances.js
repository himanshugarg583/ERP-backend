const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// module.exports = (sequelize, DataTypes) => {
  const studentsAttendances = sequelize.define("studentsAttendances", {
     id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
   

    class_section_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'class_sections', 
        key: 'id'                
            },
      onDelete: 'CASCADE'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("present", "absent", "leave"),
       allowNull: true,
       defaultValue: null,
    },
    marked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
     tableName: 'studentattendances',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["student_id", "date"]
      }
    ]
  });


  module.exports ={studentsAttendances};

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const AdmissionEnquiry = sequelize.define('AdmissionEnquiry', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
},
  phone: { 
    type: DataTypes.STRING, 
    allowNull: false
 },
  email: { 
    type: DataTypes.STRING,
     allowNull: false 
    },
    enquiry_date: {
    type: DataTypes.DATEONLY, 
    allowNull: true
  },
  className: {
     type: DataTypes.STRING,
      allowNull: false 
    },
  address: { 
    type: DataTypes.TEXT
 },
  parentName: { 
    type: DataTypes.STRING
 },
  oldSchool: { 
    type: DataTypes.STRING 
},
  source: {
    type: DataTypes.ENUM('visit', 'social_media', 'mobile','referral','friend','parent','other'),
    defaultValue: 'visit',
    allowNull: true
  },
  description: {
     type: DataTypes.TEXT 
    },
  status: {
    type: DataTypes.ENUM('active', 'admitted', 'inactive','emailenquiry','counsling_schedule'),
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tableName: 'admissionenquiries' 
});



module.exports = {AdmissionEnquiry};

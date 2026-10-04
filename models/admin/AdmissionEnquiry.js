const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const AdmissionEnquiry = sequelize.define('AdmissionEnquiry', {
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
 source: {
    type: DataTypes.ENUM('web', 'social media', 'mobile', 'referral', 'visit', 'friend', 'parent', 'other'),
    defaultValue: 'web'
  },
  parentName: { 
    type: DataTypes.STRING
 },
  oldSchool: { 
    type: DataTypes.STRING 
},
  description: {
     type: DataTypes.TEXT 
    },
  status: {
    type: DataTypes.ENUM('active', 'admitted', 'inactive','emailenquiry','counsling schedule'),
    defaultValue: 'active'
 
  }
}, {
  timestamps: true,
  tableName: 'AdmissionEnquiries' 
});



module.exports = {AdmissionEnquiry};

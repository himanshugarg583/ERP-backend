const Joi = require('joi');

const addStudentValidationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Student name is required',
    'any.required': 'Student name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters'
  }),
  email: Joi.string().trim().email().max(100).required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  gender: Joi.string().trim().lowercase().valid('male', 'female', 'other').required().messages({
    'any.only': 'Gender must be male, female, or other',
    'any.required': 'Gender is required'
  }),
  admission_no: Joi.string().trim().max(50).allow(null, '').optional().messages({
    'string.max': 'Admission number cannot exceed 50 characters'
  }),
  admission_number: Joi.string().trim().max(50).allow(null, '').optional(),
  roll_number: Joi.string().trim().max(20).allow(null, '').optional().messages({
    'string.max': 'Roll number cannot exceed 20 characters'
  }),
  class_section_id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).allow(null, '').optional(),
  dob: Joi.date().iso().allow(null, '').optional().messages({
    'date.format': 'Date of birth must be a valid date'
  }),
  admission_date: Joi.date().iso().allow(null, '').optional(),
  phone_no: Joi.string().trim().max(20).allow(null, '').optional().messages({
    'string.max': 'Phone number cannot exceed 20 characters'
  }),
  previous_school_name: Joi.string().trim().max(255).allow(null, '').optional(),
  
  // Aadhaar: max 16 chars as defined in the database VARCHAR(16)
  aadhar_no: Joi.string().trim().max(16).allow(null, '').optional().messages({
    'string.max': 'Aadhaar number cannot exceed 16 characters'
  }),
  Aadhar_no: Joi.string().trim().max(16).allow(null, '').optional().messages({
    'string.max': 'Aadhaar number cannot exceed 16 characters'
  }),
  
  address: Joi.string().trim().allow(null, '').optional(),
  father_name: Joi.string().trim().max(100).allow(null, '').optional(),
  mother_name: Joi.string().trim().max(100).allow(null, '').optional(),
  guardian_name: Joi.string().trim().max(100).allow(null, '').optional(),
  father_phone: Joi.string().trim().max(20).allow(null, '').optional(),
  mother_phone: Joi.string().trim().max(20).allow(null, '').optional(),
  parent_email_id: Joi.string().trim().email().allow(null, '').optional(),
  email_id: Joi.string().trim().email().allow(null, '').optional(),
  father_occupation: Joi.string().trim().max(100).allow(null, '').optional(),
  mother_occupation: Joi.string().trim().max(100).allow(null, '').optional()
}).unknown(true);

const updateStudentValidationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().trim().email().max(100).optional(),
  password: Joi.string().min(6).max(128).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  gender: Joi.string().trim().lowercase().valid('male', 'female', 'other').optional(),
  admission_no: Joi.string().trim().max(50).allow(null, '').optional(),
  admission_number: Joi.string().trim().max(50).allow(null, '').optional(),
  roll_number: Joi.string().trim().max(20).allow(null, '').optional(),
  class_section_id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).allow(null, '').optional(),
  dob: Joi.date().iso().allow(null, '').optional(),
  admission_date: Joi.date().iso().allow(null, '').optional(),
  phone_no: Joi.string().trim().max(20).allow(null, '').optional(),
  previous_school_name: Joi.string().trim().max(255).allow(null, '').optional(),
  aadhar_no: Joi.string().trim().max(16).allow(null, '').optional().messages({
    'string.max': 'Aadhaar number cannot exceed 16 characters'
  }),
  Aadhar_no: Joi.string().trim().max(16).allow(null, '').optional().messages({
    'string.max': 'Aadhaar number cannot exceed 16 characters'
  }),
  address: Joi.string().trim().allow(null, '').optional(),
  father_name: Joi.string().trim().max(100).allow(null, '').optional(),
  mother_name: Joi.string().trim().max(100).allow(null, '').optional(),
  guardian_name: Joi.string().trim().max(100).allow(null, '').optional(),
  father_phone: Joi.string().trim().max(20).allow(null, '').optional(),
  mother_phone: Joi.string().trim().max(20).allow(null, '').optional(),
  parent_email_id: Joi.string().trim().email().allow(null, '').optional(),
  email_id: Joi.string().trim().email().allow(null, '').optional(),
  father_occupation: Joi.string().trim().max(100).allow(null, '').optional(),
  mother_occupation: Joi.string().trim().max(100).allow(null, '').optional()
}).unknown(true);

module.exports = {
  addStudentValidationSchema,
  updateStudentValidationSchema
};

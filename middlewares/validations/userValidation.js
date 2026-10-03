const Joi = require('joi');

const userValidationSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .valid(
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
    )
    .required()
});

module.exports = userValidationSchema;

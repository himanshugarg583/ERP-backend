const express = require('express');
const router = express.Router();
const Joi = require('joi');

const { register,login ,logout} = require('../controllers/authController');

const userValidationSchema = require('../middlewares/validations/userValidation');
const validate = require('../middlewares/validationMiddleware');



router.post('/register', validate(userValidationSchema),register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const  {User}  = require('../models/admin/user');  
const { Op } = require("sequelize");
const { sequelize } = require("../models");



exports.register = async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
  
      // Check if the user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists.' });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role
      });

  
      res.status(201).json({ message: 'User created successfully!', user: newUser });
    } catch (err) {
  
      // General server error
      res.status(500).json({ message: 'Server error, please try again later.' });
    }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({
      success:false,
      statusCode:404,
      message: 'User not found' });

    // const validPassword = await compare(password, user.password);
    if ( password !== user.password) {
      return res.status(401).json({ 
          success: false,
      statusCode:401,
        message: 'Invalid credentials' });
  // password matched
       } else {

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    let loginMessage = '';

    if (user.role === 'admin') {
      loginMessage = 'Welcome back principal login';
    } else if (user.role === 'teacher') {
      loginMessage = 'Teacher login';
    } else if (user.role === 'student') {
      loginMessage = 'Student login';
    }
     else if (user.role === 'isAccountant') {
      loginMessage = 'isAccountant login';
    }

    res.status(200).json({ 
        success: true,
      statusCode:200,
        message: loginMessage,
         token,
    role:user.role });

       }  } catch (err) {
    res.status(500).json({
        success: false,
      statusCode:500,
      message: err.message });
  }
};

exports.logout = (req, res) => {
   
  res.status(200).json({
    success:true,
    statusCode:200,
    message: 'Logged out successfully' });
};



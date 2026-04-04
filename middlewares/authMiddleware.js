const jwt = require('jsonwebtoken');
const {User} = require('../models/admin/user'); 



const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if token is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success:false,
      statusCode:401,
      message: 'Authorization token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);// Check if user exists
    console.log("first",decoded);
    const user = await User.findOne({
    where:{id:decoded.id}
    });
    if (!user) {
      return res.status(401).json({ 
         success:false,
         statusCode:401,
         message: 'User not found or deleted' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    };
    next();
  } catch (err) {
    return res.status(401).json({
       success: false,
      statusCode: 401,
      message: 'Invalid or expired token',
      error: err.message
    });
  }
};



const isAdmin = (req, res, next) => {
  // console.log("role",req.user);
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success:false,
        statusCode:403,
        message: 'Only admin is authorized'
      });
    }
    next();
  };
  
const isTeacher = (req, res, next) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({
        success:false,
      statusCode:403,
        message: 'Only teacher is authorized' 
      });
    }
    next();
  };

const isAccountant = (req, res, next) => {
    if (req.user?.role !== 'accountant') {
      return res.status(403).json({ 
        success:false,
      statusCode:403,
        message: 'Only accountant is authorized'
       });
    }
    next();
  };
  
const isStudent = (req, res, next) => {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ 
        success:false,
      statusCode:403,
        message: 'Only student is authorized' 
      });
    }
    next();
  };

const isStaff = (req, res, next) => {
    if (req.user?.role !== 'staff') {
      return res.status(403).json({
        success:false,
        statusCode:403,
        message: 'Only staff is authorized'
      });
    }
    next();
  };
  
module.exports = {authMiddleware,isAdmin,isTeacher,isStudent,isAccountant,isStaff};

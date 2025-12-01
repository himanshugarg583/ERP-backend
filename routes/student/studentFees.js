const express = require('express');
const router = express.Router();
const { authMiddleware ,isStudent} = require('../../middlewares/authMiddleware');
const { getStudentFeeDetails, getStudentInstallments } = require('../../controllers/student/fees/studentFeesController');

// Get student fee details (user_id from token)
router.get('/getFeeDetails', authMiddleware,isStudent, getStudentFeeDetails);

// Get student installments (user_id from token)
router.get('/getInstallments', authMiddleware,isStudent, getStudentInstallments);

module.exports = router;

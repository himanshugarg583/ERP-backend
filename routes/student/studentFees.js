const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getStudentFeeDetails, getStudentInstallments } = require('../../controllers/student/fees/studentFeesController');

// Get student fee details (user_id from token)
router.get('/getFeeDetails', authMiddleware, getStudentFeeDetails);

// Get student installments (user_id from token)
router.get('/getInstallments', authMiddleware, getStudentInstallments);

module.exports = router;

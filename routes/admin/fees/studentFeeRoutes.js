const express = require('express');
const router = express.Router();

// Import StudentFee controller
const {
  assignFeeToStudent,
  getAllStudentFees,
  getSingleStudentFee,
  updateStudentFee,
  deleteStudentFee,
  bulkAssignFeeToStudents,
  assignFeeWithInstallments,
  getStudentCompleteeFeeDetails,
  getStudentFeeReport,
  getClassFeeAssignmentDetails,
  editClassFeeAssignment,
  viewClassFeeAssignmentStudents,
  deleteClassFeeAssignment
} = require('../../../controllers/admin/fees/StudentFeeController');

// Import middleware (adjust path as needed)
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');

// Specific routes first (before parameterized routes)
router.post('/assignFee', authMiddleware, isAdmin, assignFeeToStudent);

router.post('/bulkAssignFee', authMiddleware, isAdmin, bulkAssignFeeToStudents);

// Assign fee to multiple students with installments
router.post('/assignFeeWithInstallments', authMiddleware, isAdmin, assignFeeWithInstallments);

// Get class fee assignment details (GET version of assignFeeWithInstallments)
router.get('/getClassFeeAssignment', authMiddleware, isAdmin, getClassFeeAssignmentDetails);

// View student list for a specific class fee assignment
router.get('/viewClassFeeAssignmentStudents', authMiddleware, isAdmin, viewClassFeeAssignmentStudents);

// Edit class fee assignment (bulk edit for entire class)
router.put('/editClassFeeAssignment', authMiddleware, isAdmin, editClassFeeAssignment);

// Delete class fee assignment (with payment validation)
router.delete('/deleteClassFeeAssignment', authMiddleware, isAdmin, deleteClassFeeAssignment);

router.get('/getAllStudentFees', authMiddleware, isAdmin, getAllStudentFees);

// Get complete fee details of a student with installments
router.get('/getStudentCompleteFeeDetails/:student_id', authMiddleware, isAdmin, getStudentCompleteeFeeDetails);

// Get student fee report (summary of all fees, installments, pending, paid)
router.get('/report/:student_id', authMiddleware, isAdmin, getStudentFeeReport);

// Parameterized routes last
router.get('/getSingleStudentFee/:id', authMiddleware, isAdmin, getSingleStudentFee);

router.put('/updateStudentFee/:id', authMiddleware, isAdmin, updateStudentFee);

router.delete('/deleteStudentFee/:id', authMiddleware, isAdmin, deleteStudentFee);

module.exports = router;

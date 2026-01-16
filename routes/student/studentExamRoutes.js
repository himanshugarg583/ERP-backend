const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const {
  getStudentExamDetails,
  getStudentSpecificExamDetails
} = require('../../controllers/student/exam/studentExamController');

// Get all exam details for logged-in student (exam-wise with all subjects)
router.get('/myExams', authMiddleware, getStudentExamDetails);

// Get specific exam details for logged-in student
router.get('/myExam', authMiddleware, getStudentSpecificExamDetails);

module.exports = router;

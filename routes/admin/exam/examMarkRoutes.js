const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');
const {
  registerStudentMarks,
  updateSubjectMarks,
  bulkUpdateAllMarks,
  getMarksByScheduleAndSubject,
  getStudentMarksByExam,
  getCompleteMarksheet,
  getStudentsWithMarksBySubject,
  getStudentCompleteExamHistory
} = require('../../../controllers/admin/exam/ExamMarkController');

//  Register marks for ONE student (all subjects)
router.post('/registerStudent', authMiddleware, isAdmin, registerStudentMarks);

//  Update marks for ONE subject (all students in class)
router.post('/updateSubject', authMiddleware, isAdmin, updateSubjectMarks);

//  Bulk update marks for ALL students (all subjects)
router.post('/bulkUpdateAll', authMiddleware, isAdmin, bulkUpdateAllMarks);

// Get marks by exam schedule and subjectc
router.get('/getByScheduleAndSubject', getMarksByScheduleAndSubject);

// Get all marks for a student in an exam
router.get('/getStudentMarks', getStudentMarksByExam);

// Get complete marksheet for exam schedule
router.get('/getCompleteMarksheet', getCompleteMarksheet);

// Get all students with marks for a specific subject
router.get('/getStudentsBySubject', getStudentsWithMarksBySubject);

// Get complete exam history for a student
router.get('/getStudentExamHistory', getStudentCompleteExamHistory);

module.exports = router;

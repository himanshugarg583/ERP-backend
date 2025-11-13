const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');
const {
  registerStudentMarks,
  updateSubjectMarks,
  bulkUpdateAllMarks,
  getMarksByScheduleAndSubject,
  getStudentMarksByExam,
  getCompleteMarksheet
} = require('../../../controllers/admin/exam/ExamMarkController');

// 1. Register marks for ONE student (all subjects)
router.post('/registerStudent', authMiddleware, isAdmin, registerStudentMarks);

// 2. Update marks for ONE subject (all students in class)
router.post('/updateSubject', authMiddleware, isAdmin, updateSubjectMarks);

// 3. Bulk update marks for ALL students (all subjects)
router.post('/bulkUpdateAll', authMiddleware, isAdmin, bulkUpdateAllMarks);

// Get marks by exam schedule and subject
router.get('/getByScheduleAndSubject', getMarksByScheduleAndSubject);

// Get all marks for a student in an exam
router.get('/getStudentMarks', getStudentMarksByExam);

// Get complete marksheet for exam schedule
router.get('/getCompleteMarksheet/:exam_schedule_id', getCompleteMarksheet);

module.exports = router;

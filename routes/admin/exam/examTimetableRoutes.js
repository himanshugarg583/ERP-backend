const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');
const {
  createExamTimetable,
  getExamTimetableBySchedule,
  getExamTimetableByClassAndExam,
  getAllExamSchedulesByExam,
  updateExamTimetableEntry,
  deleteExamTimetableEntry,
  deleteExamSchedule,
  getClassScheduledExams
} = require('../../../controllers/admin/Exam/ExamTimetableController');

// Create exam timetable (creates ExamSchedule + ExamTimetable entries)
router.post('/createExamTimetable', authMiddleware, isAdmin, createExamTimetable);
router.get('/getExamTimetableByClassAndExam', getExamTimetableByClassAndExam);
router.put('/updateExamTimetableEntry/:id', authMiddleware, isAdmin, updateExamTimetableEntry);
router.delete('/deleteExamTimetableEntry/:id', authMiddleware, isAdmin, deleteExamTimetableEntry);
router.delete('/deleteExamSchedule/:exam_schedule_id', authMiddleware, isAdmin, deleteExamSchedule);
router.get('/getAllExamSchedulesByExam/:exam_id', getAllExamSchedulesByExam);

router.get('/getClassScheduledExams/:class_section_id', getClassScheduledExams);
router.get('/getExamTimetableBySchedule/:exam_schedule_id', getExamTimetableBySchedule);
module.exports = router;

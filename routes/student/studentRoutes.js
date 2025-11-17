const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getStudentMonthlyAttendance, getStudentClassAndSubjects, getStudentTimetable } = require('../../controllers/student/studentAttendanceController');

// Get student monthly attendance (user_id from token)
router.get('/getMonthlyAttendance', authMiddleware, getStudentMonthlyAttendance);

// Get student class and subjects (user_id from token)
router.get('/getClassAndSubjects', authMiddleware, getStudentClassAndSubjects);

// Get student timetable (user_id from token)
router.get('/getTimetable', authMiddleware, getStudentTimetable);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authMiddleware,isStudent } = require('../../middlewares/authMiddleware');
const { getStudentMonthlyAttendance, getStudentClassAndSubjects, getStudentTimetable } = require('../../controllers/student/studentAttendanceController');

// Get student monthly attendance (user_id from token)
router.get('/getMonthlyAttendance', authMiddleware,isStudent, getStudentMonthlyAttendance);

// Get student class and subjects (user_id from token)
router.get('/getClassAndSubjects', authMiddleware,isStudent, getStudentClassAndSubjects);

// Get student timetable (user_id from token)
router.get('/getTimetable', authMiddleware,isStudent, getStudentTimetable);
router.get('/me/timetable', authMiddleware, isStudent, getStudentTimetable);
module.exports = router;
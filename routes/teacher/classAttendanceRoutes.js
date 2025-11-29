const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getTeacherClasses, getClassStudentList, markClassAttendance, getClassAttendanceByDate } = require('../../controllers/teacher/attendance/TeacherClassController');

// Get all classes assigned to a teacher
router.get('/getTeacherClasses', authMiddleware, getTeacherClasses);

// Get student list by class_section_id
router.get('/getClassStudentList/:class_section_id', getClassStudentList);

// Mark attendance for class
router.post('/markClassAttendance',  markClassAttendance);

// Get class attendance by date
router.get('/getClassAttendanceByDate', getClassAttendanceByDate);

module.exports = router;

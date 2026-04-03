const express = require('express');
const router = express.Router();
const { authMiddleware, isTeacher } = require('../../middlewares/authMiddleware');
const { getTeacherClasses, getClassStudentList, getStudentsByClass, markClassAttendance, getClassAttendanceByDate, updateClassAttendance } = require('../../controllers/teacher/attendance/TeacherClassController');

// Get all classes assigned to a teacher
router.get('/getTeacherClasses', authMiddleware, getTeacherClasses);

// Get student list by class_section_id
router.get('/getClassStudentList/:class_section_id', getClassStudentList);

// Get students by class_id
router.get('/getStudentsByClass/:class_id', authMiddleware, isTeacher, getStudentsByClass);

// Mark attendance for class
router.post('/markClassAttendance', authMiddleware, isTeacher, markClassAttendance);

// Update attendance for current date only
router.patch('/updateClassAttendance', authMiddleware, isTeacher, updateClassAttendance);

// Get class attendance by date
router.get('/getClassAttendanceByDate', authMiddleware, isTeacher, getClassAttendanceByDate);

module.exports = router;

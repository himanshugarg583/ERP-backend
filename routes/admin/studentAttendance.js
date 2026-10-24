const express = require('express');
const router = express.Router();

const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const {markClassAttendance } = require('../../controllers/admin/Student Attendance/MakeClassAttendance');
const { getAllAvailableClasses, getStudentsByClass } = require('../../controllers/admin/Student Attendance/GetAllClasses');
const { getAttendanceReportByClass, getMonthlyAttendanceReport, getClassWiseAttendanceSummary, getClassAttendanceByDateForAdmin } = require('../../controllers/admin/Student Attendance/AttendanceReport');


// Get all available classes
router.get('/getAllClasses', authMiddleware, isAdmin, getAllAvailableClasses);

// Get all students of a specific class
router.get('/getStudentsByClass/:class_id', authMiddleware, isAdmin, getStudentsByClass);

// Mark class attendance
router.post('/markClassAttendance', authMiddleware, isAdmin, markClassAttendance);

// Get attendance report by class (daily)
router.get('/attendanceReport', authMiddleware, isAdmin, getAttendanceReportByClass);

// Get monthly attendance report by class
router.get('/monthlyAttendanceReport', authMiddleware, isAdmin, getMonthlyAttendanceReport);

// Get class-wise attendance summary for a specific date
router.get('/classWiseSummary', authMiddleware, isAdmin, getClassWiseAttendanceSummary);

// Get class attendance list by class_section_id and date
router.get('/getClassAttendanceByDate', authMiddleware, isAdmin, getClassAttendanceByDateForAdmin);




module.exports = router;

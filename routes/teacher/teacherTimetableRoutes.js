const express = require('express');
const router = express.Router();
const { authMiddleware, isTeacher } = require('../../middlewares/authMiddleware');
const { getTeacherTimetable, getClassTimetable, getTodayClasses } = require('../../controllers/teacher/timetable/teacherTimetable');

// Get teacher timetable (user_id from token)
router.get('/me', authMiddleware, isTeacher, getTeacherTimetable);

// Get teacher classes for today
router.get('/today', authMiddleware, isTeacher, getTodayClasses);

// Get class timetable by class_section_id
router.get('/classes/:class_section_id', authMiddleware, isTeacher, getClassTimetable);

// Backward-compatible aliases
router.get('/getTeacherTimetable', authMiddleware, isTeacher, getTeacherTimetable);
router.get('/getTodayClasses', authMiddleware, isTeacher, getTodayClasses);
router.get('/getClassTimetable/:class_section_id', authMiddleware, isTeacher, getClassTimetable);

module.exports = router;

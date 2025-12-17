const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { 
  getTeacherDropdown,
  getClassDropdown,
  getStudentsByClass,
  getExamTermDropdown,
  getExamDropdown,
  getExamScheduleByExam,
  getStudentsForExamMark,
  getSubjectsByClass
} = require('../../controllers/admin/dropdowns');

router.get('/getTeacherDropdown',getTeacherDropdown);
router.get('/getClassDropdown',getClassDropdown);
router.get('/getStudentsByClass/:class_id',getStudentsByClass);
router.get('/getExamTermDropdown',getExamTermDropdown);
router.get('/getExamDropdown',getExamDropdown);
router.get('/getExamScheduleByExam',getExamScheduleByExam);
router.get('/getStudentsForExamMark',getStudentsForExamMark);
router.get('/getSubjectsByClass',getSubjectsByClass);

module.exports = router;


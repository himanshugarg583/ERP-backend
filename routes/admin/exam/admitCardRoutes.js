const express = require('express');
const router = express.Router();
const {
  getStudentAdmitCard,
  getClassAdmitCards,
  getExamStudentList
} = require('../../../controllers/admin/Exam/AdmitCardController');

// Get student admit card by user ID and exam schedule ID
router.get('/getStudentAdmitCard', getStudentAdmitCard);

// Get admit cards for all students in a class
router.get('/getClassAdmitCards/:exam_schedule_id', getClassAdmitCards);

// Get student list for exam
router.get('/getExamStudentList', getExamStudentList);
// cdc
module.exports = router;


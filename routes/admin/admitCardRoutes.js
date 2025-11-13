const express = require('express');
const router = express.Router();
const {
  getStudentAdmitCard,
  getClassAdmitCards
} = require('../../controllers/admin/exam/AdmitCardController');

// Get student admit card by student ID and exam schedule ID
router.get('/getStudentAdmitCard', getStudentAdmitCard);

// Get admit cards for all students in a class
router.get('/getClassAdmitCards/:exam_schedule_id', getClassAdmitCards);

module.exports = router;

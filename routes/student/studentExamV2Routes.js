const express = require('express');
const router = express.Router();

const { authMiddleware, isStudent } = require('../../middlewares/authMiddleware');
const { attachStudentProfile } = require('../../middlewares/exam/examV2Access');
const { validate, schemas } = require('../../middlewares/exam/examV2Validation');
const {
  getMyResults,
  getMyExamSchedules,
  getMyExamEventTimetable,
  getMyEventWiseSubjectMarks
} = require('../../controllers/student/exam/examV2StudentController');

router.use(authMiddleware, isStudent, attachStudentProfile);

router.get('/schedules', getMyExamSchedules);
router.get('/schedules/:exam_event_id/timetable', getMyExamEventTimetable);
router.get('/results/event-wise-subject-marks', getMyEventWiseSubjectMarks);
router.get('/results', validate(schemas.listByEventQuery, 'query'), getMyResults);

module.exports = router;

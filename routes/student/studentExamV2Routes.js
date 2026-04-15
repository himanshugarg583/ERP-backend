const express = require('express');
const router = express.Router();

const { authMiddleware, isStudent } = require('../../middlewares/authMiddleware');
const { attachStudentProfile } = require('../../middlewares/exam/examV2Access');
const { validate, schemas } = require('../../middlewares/exam/examV2Validation');
const {
  getMyTimetable,
  getMyResults,
  getMyDocuments,
  downloadMyDocument
} = require('../../controllers/student/exam/examV2StudentController');

router.use(authMiddleware, isStudent, attachStudentProfile);

router.get('/timetable', validate(schemas.listByEventQuery, 'query'), getMyTimetable);
router.get('/results', validate(schemas.listByEventQuery, 'query'), getMyResults);
router.get('/documents', validate(schemas.listByEventQuery, 'query'), getMyDocuments);
router.get('/documents/:id/download', downloadMyDocument);

module.exports = router;

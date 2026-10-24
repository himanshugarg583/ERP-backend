const express = require('express');
const router = express.Router();

const { authMiddleware, isTeacher } = require('../../middlewares/authMiddleware');
const {
  attachTeacherProfile,
  ensureTeacherOwnsPaper,
  preventTeacherUpdateOnLockedMarks
} = require('../../middlewares/exam/examV2Access');
const { validate, schemas } = require('../../middlewares/exam/examV2Validation');

const {
  listDropdownExamTerms,
  listDropdownExamEvents,
  listDropdownClassSections,
  listDropdownPapersByEventAndClass,
  listClassStudentsByClassTeacher,
  listBulkMarksRegisterByClass,
  getBulkMarksRegisterByPaperForTeacher,
  updateBulkMarksRegisterForTeacher,
  listAssignedPapers,
  listMyTimetable,
  listPaperStudents,
  upsertMarks,
  submitMarks,
  markAttendanceBulk,
  listMarksByPaper
} = require('../../controllers/teacher/exam/teacherExamV2Controller');

router.use(authMiddleware, isTeacher, attachTeacherProfile);

router.get('/dropdowns/terms', listDropdownExamTerms);
router.get('/dropdowns/events', listDropdownExamEvents);
router.get('/dropdowns/class-sections', listDropdownClassSections);
router.get('/dropdowns/papers', listDropdownPapersByEventAndClass);
router.get('/dropdowns/students', listClassStudentsByClassTeacher);
router.get('/marks/registers', validate(schemas.marksRegisterListQuery, 'query'), listBulkMarksRegisterByClass);
router.get('/marks/registers/:exam_paper_id', validate(schemas.marksRegisterListQuery, 'query'), getBulkMarksRegisterByPaperForTeacher);
router.put('/marks/registers', validate(schemas.marksRegisterUpdate), updateBulkMarksRegisterForTeacher);

router.get('/papers', validate(schemas.listByEventQuery, 'query'), listAssignedPapers);
router.get('/timetable', validate(schemas.listByEventQuery, 'query'), listMyTimetable);

router.get('/papers/:exam_paper_id/students', ensureTeacherOwnsPaper, listPaperStudents);
router.get('/papers/:exam_paper_id/marks', ensureTeacherOwnsPaper, listMarksByPaper);

router.post(
  '/papers/:exam_paper_id/marks/upsert',
  ensureTeacherOwnsPaper,
  validate(schemas.marksUpsert),
  preventTeacherUpdateOnLockedMarks,
  upsertMarks
);

router.post(
  '/papers/:exam_paper_id/marks/submit',
  ensureTeacherOwnsPaper,
  validate(schemas.marksUpsert),
  preventTeacherUpdateOnLockedMarks,
  submitMarks
);

router.post(
  '/papers/:exam_paper_id/attendance/bulk',
  ensureTeacherOwnsPaper,
  validate(schemas.attendanceBulk),
  markAttendanceBulk
);

module.exports = router;

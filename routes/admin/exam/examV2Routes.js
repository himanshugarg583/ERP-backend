const express = require('express');
const router = express.Router();

const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');
const { validate, schemas } = require('../../../middlewares/exam/examV2Validation');

const {
  createExamType,
  listExamTypes,
  updateExamType,
  deleteExamType
} = require('../../../controllers/admin/examV2/examTypeController');

const {
  createExamEvent,
  listExamEvents,
  getExamEventById,
  updateExamEvent,
  deleteExamEvent
} = require('../../../controllers/admin/examV2/examEventController');

const {
  createExamPaper,
  listExamPapers,
  updateExamPaper,
  deleteExamPaper
} = require('../../../controllers/admin/examV2/examPaperController');

const {
  createTimetableEntry,
  listTimetable,
  updateTimetableEntry,
  deleteTimetableEntry
} = require('../../../controllers/admin/examV2/examTimetableController');

const {
  createAttendance,
  createAttendanceBulk,
  listAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance
} = require('../../../controllers/admin/examV2/examAttendanceController');

const {
  listResults,
  recomputeResults,
  publishResults,
  listMarksEntries
} = require('../../../controllers/admin/examV2/resultController');

const {
  createBulkMarksRegister,
  listBulkMarksRegister,
  getBulkMarksRegisterByPaper,
  updateBulkMarksRegister,
  deleteBulkMarksRegister
} = require('../../../controllers/admin/examV2/marksRegisterController');

const {
  createTemplate,
  listTemplates,
  updateTemplate,
  generateDocument,
  listDocuments,
  getAdmitCardData
} = require('../../../controllers/admin/examV2/documentController');

router.use(authMiddleware, isAdmin);

router.post('/types', validate(schemas.examTypeCreate), createExamType);
router.get('/types', listExamTypes);
router.patch('/types/:id', validate(schemas.examTypeUpdate), updateExamType);
router.delete('/types/:id', deleteExamType);

router.post('/events', validate(schemas.examEventCreate), createExamEvent);
router.get('/events', validate(schemas.listByEventQuery, 'query'), listExamEvents);
router.get('/events/:id', getExamEventById);
router.patch('/events/:id', validate(schemas.examEventUpdate), updateExamEvent);
router.delete('/events/:id', deleteExamEvent);

router.post('/papers', validate(schemas.examPaperCreate), createExamPaper);
router.get('/papers', validate(schemas.listByEventQuery, 'query'), listExamPapers);
router.patch('/papers/:id', validate(schemas.examPaperUpdate), updateExamPaper);
router.delete('/papers/:id', deleteExamPaper);

router.post('/timetable', validate(schemas.timetableCreate), createTimetableEntry);
router.get('/timetable', validate(schemas.listByEventQuery, 'query'), listTimetable);
router.patch('/timetable/:id', validate(schemas.timetableUpdate), updateTimetableEntry);
router.delete('/timetable/:id', deleteTimetableEntry);

router.post('/attendance', validate(schemas.attendanceCreate), createAttendance);
router.post('/attendance/bulk', validate(schemas.attendanceBulkAdmin), createAttendanceBulk);
router.get('/attendance', validate(schemas.attendanceListQuery, 'query'), listAttendance);
router.get('/attendance/:id', getAttendanceById);
router.put('/attendance/:id', validate(schemas.attendanceUpdate), updateAttendance);
router.delete('/attendance/:id', deleteAttendance);

router.get('/marks', listMarksEntries);

router.post('/marks/registers', validate(schemas.marksRegisterCreate), createBulkMarksRegister);
router.get('/marks/registers', validate(schemas.marksRegisterListQuery, 'query'), listBulkMarksRegister);
router.get('/marks/registers/:exam_paper_id', validate(schemas.marksRegisterListQuery, 'query'), getBulkMarksRegisterByPaper);
router.put('/marks/registers', validate(schemas.marksRegisterUpdate), updateBulkMarksRegister);
router.delete('/marks/registers', validate(schemas.marksRegisterDelete), deleteBulkMarksRegister);

router.get('/results', validate(schemas.listByEventQuery, 'query'), listResults);
router.post('/results/recompute', validate(schemas.resultRecompute), recomputeResults);
router.post('/results/publish', validate(schemas.resultPublish), publishResults);

router.post('/templates', validate(schemas.documentTemplateCreate), createTemplate);
router.get('/templates', validate(schemas.listByEventQuery, 'query'), listTemplates);
router.patch('/templates/:id', validate(schemas.documentTemplateUpdate), updateTemplate);

router.get('/documents/admit-card-data', validate(schemas.admitCardDataQuery, 'query'), getAdmitCardData);
router.post('/documents/generate', validate(schemas.generateDocument), generateDocument);
router.get('/documents', validate(schemas.listByEventQuery, 'query'), listDocuments);

module.exports = router;

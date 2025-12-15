const express = require('express');
const router = express.Router();
const { authMiddleware, isStudent } = require('../../middlewares/authMiddleware');
const {
  getMyClassResources,
  getClassResourceById,
  getMySubjectResources,
  getSubjectResourcesBySubject,
  getSubjectResourceById,
  getMyAssignments
} = require('../../controllers/student/contentUpload/studentResourceController');

// Class Resources
router.get('/classResources',  authMiddleware, isStudent, getMyClassResources);
router.get('/classResource/:resource_id', authMiddleware, isStudent, getClassResourceById);

// Subject Resources
router.get('/subjectResources', authMiddleware, isStudent, getMySubjectResources);
router.get('/subjectResources/subject/:subject_id', authMiddleware, isStudent, getSubjectResourcesBySubject);
router.get('/subjectResource/:resource_id', authMiddleware, isStudent, getSubjectResourceById);

// Assignments
router.get('/assignments', authMiddleware, isStudent, getMyAssignments);

module.exports = router;

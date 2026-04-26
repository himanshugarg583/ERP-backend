const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, enforceStudentSelfByParam } = require('../../../middlewares/fees/feeSecurityMiddleware');
const assignmentController = require('../../../controllers/student/fees/assignmentController');

const router = express.Router();
const studentOnly = [authMiddleware, requireRoles('student')];

router.get('/students/assignment/:studentId', ...studentOnly, enforceStudentSelfByParam('studentId'), assignmentController.getActiveAssignmentForStudent);

module.exports = router;
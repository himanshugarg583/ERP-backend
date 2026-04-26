const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const assignmentController = require('../../../controllers/teacher/fees/assignmentController');

const router = express.Router();
const teacherOnly = [authMiddleware, requireRoles('teacher')];

router.get('/students/assignment/:studentId', ...teacherOnly, assignmentController.getActiveAssignmentForStudent);

module.exports = router;
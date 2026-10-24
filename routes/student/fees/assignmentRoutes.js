const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const assignmentController = require('../../../controllers/student/fees/assignmentController');

const router = express.Router();
const studentOnly = [authMiddleware, requireRoles('student')];

router.get('/assignment', ...studentOnly, assignmentController.getActiveAssignmentForStudent);

module.exports = router;
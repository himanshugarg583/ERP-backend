const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, enforceStudentSelfByParam } = require('../../../middlewares/fees/feeSecurityMiddleware');
const assignmentController = require('../../../controllers/admin/fees/assignmentController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const adminOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const studentSelfOrFinance = [
  authMiddleware,
  requireRoles('admin', 'accountant', 'student'),
  enforceStudentSelfByParam('studentId')
];

router.post('/assignments/preview/:structureId', ...adminOnly, assignmentController.previewBulkAssignment);
router.post('/assignments/student', ...adminOnly, assignmentController.assignSingleStudent);
router.post('/assignments/bulk', ...adminOnly, assignmentController.assignBulk);
router.post('/assignments/one-time', ...adminOnly, assignmentController.assignOneTimeFee);
router.get('/assignments', ...financeOnly, assignmentController.listAssignments);
router.get('/assignments/:id', ...financeOnly, assignmentController.getAssignmentById);
router.get('/students/assignment/:studentId', ...studentSelfOrFinance, assignmentController.getActiveAssignmentForStudent);
router.put('/assignments/cancel/:id', ...adminOnly, assignmentController.cancelAssignment);

module.exports = router;
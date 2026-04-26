const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, enforceStudentSelfByParam } = require('../../../middlewares/fees/feeSecurityMiddleware');
const reportController = require('../../../controllers/student/fees/reportController');

const router = express.Router();
const studentOnly = [authMiddleware, requireRoles('student')];

router.get('/reports/student-ledger/:id', ...studentOnly, enforceStudentSelfByParam('id'), reportController.getStudentLedger);

module.exports = router;
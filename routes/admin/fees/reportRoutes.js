const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, enforceStudentSelfByParam } = require('../../../middlewares/fees/feeSecurityMiddleware');
const reportController = require('../../../controllers/admin/fees/reportController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const studentOrFinance = [authMiddleware, requireRoles('admin', 'accountant', 'student')];

router.get('/reports/collection-summary', ...financeOnly, reportController.getCollectionSummary);
router.get('/reports/dues', ...financeOnly, reportController.getDuesReport);
router.get('/reports/defaulters', ...financeOnly, reportController.getDefaultersReport);
router.get('/reports/head-wise', ...financeOnly, reportController.getHeadWiseReport);
router.get('/reports/student-ledger/:id', ...studentOrFinance, enforceStudentSelfByParam('id'), reportController.getStudentLedger);
router.post('/reports/export', ...financeOnly, reportController.exportReport);

module.exports = router;
const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const reportController = require('../../../controllers/teacher/fees/reportController');

const router = express.Router();
const teacherOnly = [authMiddleware, requireRoles('teacher')];

router.get('/reports/defaulters', ...teacherOnly, reportController.getDefaultersReport);
router.get('/reports/dues', ...teacherOnly, reportController.getDuesReport);

module.exports = router;
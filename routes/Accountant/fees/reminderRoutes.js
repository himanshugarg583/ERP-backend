const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const reminderController = require('../../../controllers/Accountant/fees/reminderController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];

router.post('/reminders/bulk-send', ...financeOnly, reminderController.sendBulkReminder);

module.exports = router;
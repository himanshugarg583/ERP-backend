const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const refundController = require('../../../controllers/Accountant/fees/refundController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const adminOnly = [authMiddleware, requireRoles('admin', 'accountant')];

router.post('/refunds', ...financeOnly, refundController.initiateRefund);
router.get('/refunds/pending', ...adminOnly, refundController.listPendingRefunds);
router.put('/refunds/approve/:id', ...adminOnly, refundController.approveRefund);
router.put('/refunds/reject/:id', ...adminOnly, refundController.rejectRefund);

module.exports = router;
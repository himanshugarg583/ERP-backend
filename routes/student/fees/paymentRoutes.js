const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, inMemoryRateLimiter } = require('../../../middlewares/fees/feeSecurityMiddleware');
const paymentController = require('../../../controllers/student/fees/paymentController');

const router = express.Router();
const studentOnly = [authMiddleware, requireRoles('student')];

router.post('/payments/initiate-online', ...studentOnly, inMemoryRateLimiter({ key: 'initiate_online', max: 50, windowMs: 60 * 1000 }), paymentController.initiateOnlinePayment);
router.get('/payments/:id', ...studentOnly, paymentController.getPaymentById);
router.get('/payments/receipt/:id', ...studentOnly, paymentController.getReceipt);

module.exports = router;
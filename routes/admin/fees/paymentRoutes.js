const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, inMemoryRateLimiter } = require('../../../middlewares/fees/feeSecurityMiddleware');
const paymentController = require('../../../controllers/admin/fees/paymentController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const studentOrFinance = [authMiddleware, requireRoles('admin', 'accountant', 'student')];

router.post('/payments/collect', ...financeOnly, inMemoryRateLimiter({ key: 'collect_fee', max: 40, windowMs: 60 * 1000 }), paymentController.collectPayment);
router.post('/payments/initiate-online', ...studentOrFinance, inMemoryRateLimiter({ key: 'initiate_online', max: 50, windowMs: 60 * 1000 }), paymentController.initiateOnlinePayment);
router.get('/payments/:id', ...studentOrFinance, paymentController.getPaymentById);
router.get('/payments/receipt/:id', ...studentOrFinance, paymentController.getReceipt);
router.post('/payments/send-receipt/:id', ...financeOnly, paymentController.sendReceipt);
router.post('/payments/cancel/:id', ...financeOnly, paymentController.cancelPayment);
router.put('/payments/cheque-status/:id', ...financeOnly, paymentController.updateChequeStatus);

module.exports = router;
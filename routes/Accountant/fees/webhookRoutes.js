const express = require('express');
const { inMemoryRateLimiter } = require('../../../middlewares/fees/feeSecurityMiddleware');
const paymentController = require('../../../controllers/Accountant/fees/paymentController');

const router = express.Router();

router.post('/payments/webhook/razorpay', inMemoryRateLimiter({ key: 'rzp_webhook', max: 120, windowMs: 60 * 1000 }), paymentController.razorpayWebhook);

module.exports = router;
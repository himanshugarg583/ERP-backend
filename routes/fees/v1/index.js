const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const {
  Joi,
  validateBody,
  inMemoryRateLimiter,
  requireRoles,
  enforceStudentSelfByParam
} = require('../../../middlewares/fees/feeSecurityMiddleware');

const feeHeadController = require('../../../controllers/fees/v1/feeHeadController');
const feeStructureController = require('../../../controllers/fees/v1/feeStructureController');
const installmentController = require('../../../controllers/fees/v1/installmentController');
const assignmentController = require('../../../controllers/fees/v1/assignmentController');
const concessionController = require('../../../controllers/fees/v1/concessionController');
const invoiceController = require('../../../controllers/fees/v1/invoiceController');
const paymentController = require('../../../controllers/fees/v1/paymentController');
const refundController = require('../../../controllers/fees/v1/refundController');
const reportController = require('../../../controllers/fees/v1/reportController');
const reminderController = require('../../../controllers/fees/v1/reminderController');
const settingsController = require('../../../controllers/fees/v1/settingsController');

const router = express.Router();

const adminOnly = [authMiddleware, requireRoles('admin')];
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const studentOrFinance = [authMiddleware, requireRoles('admin', 'accountant', 'student')];
const studentSelfOrFinance = [
  authMiddleware,
  requireRoles('admin', 'accountant', 'student'),
  enforceStudentSelfByParam('studentId')
];

// Public webhook endpoint with request-level throttling.
router.post('/payments/webhook/razorpay', inMemoryRateLimiter({ key: 'rzp_webhook', max: 120, windowMs: 60 * 1000 }), paymentController.razorpayWebhook);

// Fee Heads
router.get('/fee-heads', ...financeOnly, feeHeadController.listFeeHeads);
router.post('/fee-heads', ...adminOnly, validateBody(Joi.object({
  name: Joi.string().max(100).required(),
  category: Joi.string().valid('academic', 'facility', 'transport', 'hostel', 'exam', 'other').required(),
  description: Joi.string().allow(null, ''),
  is_optional: Joi.boolean().optional(),
  is_refundable: Joi.boolean().optional(),
  ledger_code: Joi.string().max(20).allow(null, '')
})), feeHeadController.createFeeHead);
router.get('/fee-heads/:id', ...financeOnly, feeHeadController.getFeeHead);
router.put('/fee-heads/:id', ...adminOnly, feeHeadController.updateFeeHead);
router.delete('/fee-heads/:id', ...adminOnly, feeHeadController.deactivateFeeHead);

// Fee Structures
router.get('/fee-structures', ...financeOnly, feeStructureController.listStructures);
router.post('/fee-structures', ...adminOnly, feeStructureController.createStructure);
router.get('/fee-structures/:id', ...financeOnly, feeStructureController.getStructureById);
router.put('/fee-structures/:id', ...adminOnly, feeStructureController.updateStructure);
router.post('/fee-structures/:id/clone', ...adminOnly, feeStructureController.cloneStructure);
router.get('/fee-structures/:id/preview', ...financeOnly, feeStructureController.structurePreview);

// Installments
router.get('/fee-structures/:structureId/installments', ...financeOnly, installmentController.listInstallments);
router.post('/fee-structures/:structureId/installments', ...adminOnly, installmentController.createInstallments);
router.put('/installments/:id', ...adminOnly, installmentController.updateInstallment);
router.delete('/installments/:id', ...adminOnly, installmentController.deleteInstallment);

// Assignments
router.post('/assignments/preview/:structureId', ...adminOnly, assignmentController.previewBulkAssignment);
router.post('/assignments/student', ...adminOnly, assignmentController.assignSingleStudent);
router.post('/assignments/bulk', ...adminOnly, assignmentController.assignBulk);
router.post('/assignments/one-time', ...adminOnly, assignmentController.assignOneTimeFee);
router.get('/assignments/:id', ...financeOnly, assignmentController.getAssignmentById);
router.get('/students/:studentId/assignment', ...studentSelfOrFinance, assignmentController.getActiveAssignmentForStudent);
router.put('/assignments/:id/cancel', ...adminOnly, assignmentController.cancelAssignment);

// Concessions
router.get('/concessions', ...financeOnly, concessionController.listConcessions);
router.post('/concessions', ...adminOnly, concessionController.createConcession);
router.put('/concessions/:id', ...adminOnly, concessionController.updateConcession);
router.post('/students/:studentId/concessions', ...financeOnly, concessionController.applyConcessionToStudent);
router.get('/concession-requests/pending', ...adminOnly, concessionController.listPendingConcessionRequests);
router.put('/concession-requests/:id/approve', ...adminOnly, concessionController.approveConcessionRequest);
router.put('/concession-requests/:id/reject', ...adminOnly, concessionController.rejectConcessionRequest);
router.get('/students/:studentId/concessions', ...studentSelfOrFinance, concessionController.listStudentConcessions);

// Invoices
router.get('/invoices', ...financeOnly, invoiceController.listInvoices);
router.get('/invoices/:id', ...studentOrFinance, invoiceController.getInvoiceById);
router.post('/invoices/generate', ...adminOnly, invoiceController.generateInvoices);
router.get('/students/:studentId/invoices', ...studentSelfOrFinance, invoiceController.listStudentInvoices);
router.put('/invoices/:id/waive', ...adminOnly, invoiceController.waiveInvoice);

// Payments
router.post('/payments/collect', ...financeOnly, inMemoryRateLimiter({ key: 'collect_fee', max: 40, windowMs: 60 * 1000 }), paymentController.collectPayment);
router.post('/payments/initiate-online', ...studentOrFinance, inMemoryRateLimiter({ key: 'initiate_online', max: 50, windowMs: 60 * 1000 }), paymentController.initiateOnlinePayment);
router.get('/payments/:id', ...studentOrFinance, paymentController.getPaymentById);
router.get('/payments/:id/receipt', ...studentOrFinance, paymentController.getReceipt);
router.post('/payments/:id/send-receipt', ...financeOnly, paymentController.sendReceipt);
router.post('/payments/:id/cancel', ...financeOnly, paymentController.cancelPayment);
router.put('/payments/:id/cheque-status', ...financeOnly, paymentController.updateChequeStatus);

// Refunds
router.post('/refunds', ...financeOnly, refundController.initiateRefund);
router.get('/refunds/pending', ...adminOnly, refundController.listPendingRefunds);
router.put('/refunds/:id/approve', ...adminOnly, refundController.approveRefund);
router.put('/refunds/:id/reject', ...adminOnly, refundController.rejectRefund);

// Reports
router.get('/reports/collection-summary', ...financeOnly, reportController.getCollectionSummary);
router.get('/reports/dues', ...financeOnly, reportController.getDuesReport);
router.get('/reports/defaulters', ...financeOnly, reportController.getDefaultersReport);
router.get('/reports/head-wise', ...financeOnly, reportController.getHeadWiseReport);
router.get('/reports/student-ledger/:id', ...studentOrFinance, enforceStudentSelfByParam('id'), reportController.getStudentLedger);
router.get('/reports/concession-impact', ...adminOnly, reportController.getConcessionImpact);
router.post('/reports/export', ...financeOnly, reportController.exportReport);

// Reminders
router.post('/reminders/bulk-send', ...financeOnly, reminderController.sendBulkReminder);

// Fee settings
router.get('/settings', ...adminOnly, settingsController.getFeeSettings);
router.put('/settings', ...adminOnly, settingsController.updateFeeSettings);

module.exports = router;

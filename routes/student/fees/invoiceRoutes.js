const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const invoiceController = require('../../../controllers/student/fees/invoiceController');

const router = express.Router();
const studentOnly = [authMiddleware, requireRoles('student')];

router.get('/invoices/unpaid', ...studentOnly, invoiceController.getStudentUnpaidInvoices);
router.get('/invoices', ...studentOnly, invoiceController.listStudentInvoices);
router.get('/invoices/:id', ...studentOnly, invoiceController.getInvoiceById);

module.exports = router;
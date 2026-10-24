const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, enforceStudentSelfByParam } = require('../../../middlewares/fees/feeSecurityMiddleware');
const invoiceController = require('../../../controllers/Accountant/fees/invoiceController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const adminOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const studentOrFinance = [authMiddleware, requireRoles('admin', 'accountant', 'student')];
const studentSelfOrFinance = [
	authMiddleware,
	requireRoles('admin', 'accountant', 'student'),
	enforceStudentSelfByParam('studentId')
];

router.get('/invoices', ...financeOnly, invoiceController.listInvoices);
router.get('/invoices/:id', ...studentOrFinance, invoiceController.getInvoiceById);
router.post('/invoices/generate', ...adminOnly, invoiceController.generateInvoices);
router.get('/students/invoices/:studentId', ...studentSelfOrFinance, invoiceController.listStudentInvoices);
router.get('/students/unpaid-invoices/:studentId', ...studentSelfOrFinance, invoiceController.getStudentUnpaidInvoices);
router.put('/invoices/waive/:id', ...adminOnly, invoiceController.waiveInvoice);

module.exports = router;
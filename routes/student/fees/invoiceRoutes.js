const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles, enforceStudentSelfByParam } = require('../../../middlewares/fees/feeSecurityMiddleware');
const invoiceController = require('../../../controllers/student/fees/invoiceController');

const router = express.Router();
const studentOnly = [authMiddleware, requireRoles('student')];

router.get('/invoices/:id', ...studentOnly, invoiceController.getInvoiceById);
router.get('/students/invoices/:studentId', ...studentOnly, enforceStudentSelfByParam('studentId'), invoiceController.listStudentInvoices);

module.exports = router;
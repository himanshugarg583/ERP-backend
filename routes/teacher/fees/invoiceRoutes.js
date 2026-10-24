const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const invoiceController = require('../../../controllers/teacher/fees/invoiceController');

const router = express.Router();
const teacherOnly = [authMiddleware, requireRoles('teacher')];

router.get('/invoices/:id', ...teacherOnly, invoiceController.getInvoiceById);
router.get('/students/invoices/:studentId', ...teacherOnly, invoiceController.listStudentInvoices);

module.exports = router;
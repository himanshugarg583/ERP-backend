const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const installmentController = require('../../../controllers/Accountant/fees/installmentController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const adminOnly = [authMiddleware, requireRoles('admin', 'accountant')];

router.get('/fee-structures/installments/:structureId', ...financeOnly, installmentController.listInstallments);
router.post('/fee-structures/installments/:structureId', ...adminOnly, installmentController.createInstallments);
router.put('/installments/:id', ...adminOnly, installmentController.updateInstallment);
router.delete('/installments/:id', ...adminOnly, installmentController.deleteInstallment);

module.exports = router;
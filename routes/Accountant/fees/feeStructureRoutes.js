const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const feeStructureController = require('../../../controllers/Accountant/fees/feeStructureController');

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const adminOnly = [authMiddleware, requireRoles('admin', 'accountant')];

router.get('/dropdown/fee-structures', ...financeOnly, feeStructureController.listFeeStructureDropdown);
router.get('/fee-structures', ...financeOnly, feeStructureController.listStructures);
router.post('/fee-structures', ...adminOnly, feeStructureController.createStructure);
router.get('/fee-structures/:id', ...financeOnly, feeStructureController.getStructureById);
router.put('/fee-structures/:id', ...adminOnly, feeStructureController.updateStructure);
router.post('/fee-structures/clone/:id', ...adminOnly, feeStructureController.cloneStructure);
router.get('/fee-structures/preview/:id', ...financeOnly, feeStructureController.structurePreview);

module.exports = router;
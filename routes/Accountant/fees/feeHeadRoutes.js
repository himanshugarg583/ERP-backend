const express = require('express');
const { authMiddleware } = require('../../../middlewares/authMiddleware');
const { Joi, validateBody, requireRoles } = require('../../../middlewares/fees/feeSecurityMiddleware');
const feeHeadController = require('../../../controllers/Accountant/fees/feeHeadController');

const feeHeadCreateSchema = Joi.object({
	name: Joi.string().max(100).required(),
	category: Joi.string().valid('academic', 'facility', 'transport', 'hostel', 'exam', 'other').required(),
	description: Joi.string().allow(null, ''),
	is_optional: Joi.boolean().optional(),
	is_refundable: Joi.boolean().optional(),
	ledger_code: Joi.string().max(20).allow(null, '')
});

const router = express.Router();
const financeOnly = [authMiddleware, requireRoles('admin', 'accountant')];
const adminOnly = [authMiddleware, requireRoles('admin', 'accountant')];

router.get('/dropdown/fee-heads', ...financeOnly, feeHeadController.listFeeHeadDropdown);
router.get('/dropdown/class-sections', ...financeOnly, feeHeadController.listClassSectionDropdown);
router.get('/dropdown/academic-years', ...financeOnly, feeHeadController.listAcademicYearDropdown);
router.get('/fee-heads', ...financeOnly, feeHeadController.listFeeHeads);
router.post('/fee-heads', ...adminOnly, validateBody(feeHeadCreateSchema), feeHeadController.createFeeHead);
router.get('/fee-heads/:id', ...financeOnly, feeHeadController.getFeeHead);
router.put('/fee-heads/:id', ...adminOnly, feeHeadController.updateFeeHead);
router.delete('/fee-heads/:id', ...adminOnly, feeHeadController.deactivateFeeHead);

module.exports = router;
const sequelize = require('../../../config/db');
const { InstallmentPlanV1, FeeStructureV1, FeeInvoiceV1, FeeStructureItemV1 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');
const { normalizeInstallmentsAgainstTotal } = require('../../../services/fees/v1/feeRulesService');

const listInstallments = async (req, res) => {
  try {
    const rows = await InstallmentPlanV1.findAll({
      where: { fee_structure_id: req.params.structureId },
      order: [['installment_number', 'ASC']]
    });

    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const createInstallments = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const structure = await FeeStructureV1.findByPk(req.params.structureId, { transaction });
    if (!structure) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'not_found', message: 'Fee structure not found' });
    }

    const installments = req.body.installments || [];
    if (!Array.isArray(installments) || installments.length === 0) {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_payload', message: 'Installments payload is required.' });
    }

    // Validate each installment
    for (let i = 0; i < installments.length; i++) {
      const inst = installments[i];
      
      if (!inst.name || inst.name.trim() === '') {
        await transaction.rollback();
        return fail(res, { statusCode: 422, code: 'invalid_installment', message: `Installment ${i + 1}: Name is required` });
      }

      if (!inst.due_date) {
        await transaction.rollback();
        return fail(res, { statusCode: 422, code: 'invalid_due_date', message: `Installment ${i + 1}: Due date is required` });
      }

      // Validate date format
      const dueDateObj = new Date(inst.due_date);
      if (isNaN(dueDateObj.getTime())) {
        await transaction.rollback();
        return fail(res, { statusCode: 422, code: 'invalid_date_format', message: `Installment ${i + 1}: Due date must be a valid date` });
      }

      // Validate start_date if provided
      if (inst.start_date) {
        const startDateObj = new Date(inst.start_date);
        if (isNaN(startDateObj.getTime())) {
          await transaction.rollback();
          return fail(res, { statusCode: 422, code: 'invalid_date_format', message: `Installment ${i + 1}: Start date must be a valid date` });
        }

        // Check start_date is before due_date
        if (startDateObj >= dueDateObj) {
          await transaction.rollback();
          return fail(res, { 
            statusCode: 422, 
            code: 'invalid_date_order', 
            message: `Installment ${i + 1}: Start date must be before due date` 
          });
        }
      }

      if (!inst.percentage || Number(inst.percentage) <= 0 || Number(inst.percentage) > 100) {
        await transaction.rollback();
        return fail(res, { statusCode: 422, code: 'invalid_percentage', message: `Installment ${i + 1}: Percentage must be between 1 and 100` });
      }

      if (inst.late_fine_value && Number(inst.late_fine_value) < 0) {
        await transaction.rollback();
        return fail(res, { statusCode: 422, code: 'invalid_late_fine', message: `Installment ${i + 1}: Late fine cannot be negative` });
      }

      if (inst.grace_period_days && Number(inst.grace_period_days) < 0) {
        await transaction.rollback();
        return fail(res, { statusCode: 422, code: 'invalid_grace_period', message: `Installment ${i + 1}: Grace period cannot be negative` });
      }
    }

    const items = await FeeStructureItemV1.findAll({
      where: { fee_structure_id: structure.id },
      transaction
    });

    const structureTotalAmount = items.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const normalizedInstallments = normalizeInstallmentsAgainstTotal({
      installments,
      totalAmount: structureTotalAmount
    });

    if (structure.structure_type === 'one_time' && (normalizedInstallments.length !== 1 || Number(normalizedInstallments[0].percentage) !== 100)) {
      await transaction.rollback();
      return fail(res, {
        statusCode: 422,
        code: 'invalid_one_time_installments',
        message: 'One-time fee structure must have one installment with 100%.'
      });
    }

    await InstallmentPlanV1.destroy({ where: { fee_structure_id: structure.id }, transaction });

    const rows = normalizedInstallments.map((item, index) => ({
      fee_structure_id: structure.id,
      name: item.name,
      installment_number: item.installment_number || item.sequence_no || index + 1,
      start_date: item.start_date || null,
      due_date: item.due_date,
      percentage: Number(item.percentage),
      allow_partial_payment: item.allow_partial_payment !== undefined ? Boolean(item.allow_partial_payment) : true,
      fixed_amount: item.fixed_amount ?? null,
      late_fine_type: item.late_fine_type || 'none',
      late_fine_value: Number(item.late_fine_value || 0),
      max_late_fine: item.max_late_fine ?? null,
      grace_period_days: Number(item.grace_period_days || 0)
    }));

    const created = await InstallmentPlanV1.bulkCreate(rows, { transaction });
    await transaction.commit();

    return ok(res, created, { total: created.length }, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: error.statusCode || 500, code: 'internal_error', message: error.message });
  }
};

const updateInstallment = async (req, res) => {
  try {
    const row = await InstallmentPlanV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Installment not found' });

    const invoiceCount = await FeeInvoiceV1.count({ where: { installment_plan_id: row.id } });
    if (invoiceCount > 0) {
      return fail(res, {
        statusCode: 409,
        code: 'installment_locked',
        message: 'Cannot edit installment after invoices are generated.'
      });
    }

    // Validate fields
    const name = req.body.name ?? row.name;
    if (!name || name.trim() === '') {
      return fail(res, { statusCode: 422, code: 'invalid_name', message: 'Installment name is required' });
    }

    const dueDate = req.body.due_date ?? row.due_date;
    if (!dueDate) {
      return fail(res, { statusCode: 422, code: 'invalid_due_date', message: 'Due date is required' });
    }

    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return fail(res, { statusCode: 422, code: 'invalid_date_format', message: 'Due date must be a valid date' });
    }

    const startDate = req.body.start_date ?? row.start_date;
    if (startDate) {
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        return fail(res, { statusCode: 422, code: 'invalid_date_format', message: 'Start date must be a valid date' });
      }

      // Check start_date is before due_date
      if (startDateObj >= dueDateObj) {
        return fail(res, { 
          statusCode: 422, 
          code: 'invalid_date_order', 
          message: 'Start date must be before due date' 
        });
      }
    }

    const percentage = req.body.percentage ?? row.percentage;
    if (!percentage || Number(percentage) <= 0 || Number(percentage) > 100) {
      return fail(res, { statusCode: 422, code: 'invalid_percentage', message: 'Percentage must be between 1 and 100' });
    }

    const lateFineValue = req.body.late_fine_value ?? row.late_fine_value;
    if (lateFineValue && Number(lateFineValue) < 0) {
      return fail(res, { statusCode: 422, code: 'invalid_late_fine', message: 'Late fine cannot be negative' });
    }

    const gracePeriodDays = req.body.grace_period_days ?? row.grace_period_days;
    if (gracePeriodDays && Number(gracePeriodDays) < 0) {
      return fail(res, { statusCode: 422, code: 'invalid_grace_period', message: 'Grace period cannot be negative' });
    }

    await row.update({
      name,
      start_date: startDate,
      due_date: dueDate,
      percentage,
      allow_partial_payment: req.body.allow_partial_payment ?? row.allow_partial_payment,
      fixed_amount: req.body.fixed_amount ?? row.fixed_amount,
      late_fine_type: req.body.late_fine_type ?? row.late_fine_type,
      late_fine_value: lateFineValue,
      max_late_fine: req.body.max_late_fine ?? row.max_late_fine,
      grace_period_days: gracePeriodDays
    });
    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const deleteInstallment = async (req, res) => {
  try {
    const row = await InstallmentPlanV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Installment not found' });

    const invoiceCount = await FeeInvoiceV1.count({ where: { installment_plan_id: row.id } });
    if (invoiceCount > 0) {
      return fail(res, {
        statusCode: 409,
        code: 'installment_locked',
        message: 'Cannot delete installment after invoices are generated.'
      });
    }

    await row.destroy();
    return ok(res, { deleted: true, id: row.id });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  listInstallments,
  createInstallments,
  updateInstallment,
  deleteInstallment
};

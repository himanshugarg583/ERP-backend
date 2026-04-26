const sequelize = require('../../../config/db');
const { InstallmentPlanV1, FeeStructureV1, FeeInvoiceV1 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');
const { validateInstallmentPercentages } = require('../../../services/fees/v1/feeRulesService');

const listInstallments = async (req, res) => {
  try {
    const rows = await InstallmentPlanV1.findAll({
      where: { fee_structure_id: req.params.structureId },
      order: [['sequence_no', 'ASC'], ['installment_number', 'ASC']]
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

    validateInstallmentPercentages(installments);

    if (structure.structure_type === 'one_time' && (installments.length !== 1 || Number(installments[0].percentage) !== 100)) {
      await transaction.rollback();
      return fail(res, {
        statusCode: 422,
        code: 'invalid_one_time_installments',
        message: 'One-time fee structure must have one installment with 100%.'
      });
    }

    await InstallmentPlanV1.destroy({ where: { fee_structure_id: structure.id }, transaction });

    const rows = installments.map((item, index) => ({
      fee_structure_id: structure.id,
      name: item.name,
      installment_number: item.installment_number || index + 1,
      sequence_no: item.sequence_no || item.installment_number || index + 1,
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

    await row.update({
      name: req.body.name ?? row.name,
      start_date: req.body.start_date ?? row.start_date,
      sequence_no: req.body.sequence_no ?? row.sequence_no,
      due_date: req.body.due_date ?? row.due_date,
      percentage: req.body.percentage ?? row.percentage,
      allow_partial_payment: req.body.allow_partial_payment ?? row.allow_partial_payment,
      fixed_amount: req.body.fixed_amount ?? row.fixed_amount,
      late_fine_type: req.body.late_fine_type ?? row.late_fine_type,
      late_fine_value: req.body.late_fine_value ?? row.late_fine_value,
      max_late_fine: req.body.max_late_fine ?? row.max_late_fine,
      grace_period_days: req.body.grace_period_days ?? row.grace_period_days
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

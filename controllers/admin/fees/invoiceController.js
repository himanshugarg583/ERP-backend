const sequelize = require('../../../config/db');
const { Op } = require('sequelize');
const {
  FeeInvoiceV1,
  FeeInvoiceItemV1,
  FeePaymentV1,
  StudentFeeAssignmentV1,
  InstallmentPlanV1
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');
const { createInvoiceForAssignmentInstallment, generateInvoicesForDate } = require('../../../services/fees/v1/invoiceService');
const { deriveInvoiceStatus } = require('../../../services/fees/v1/feeRulesService');

const resolveStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return student ? Number(student.id) : null;
};

const listInvoices = async (req, res) => {
  try {
    const where = {};

    if (req.query.student_id) where.student_id = Number(req.query.student_id);
    if (req.query.status) where.status = req.query.status;
    if (req.query.academic_year_id) where.academic_year_id = req.query.academic_year_id;

    if (req.query.due_date_from || req.query.due_date_to) {
      where.due_date = {};
      if (req.query.due_date_from) where.due_date[Op.gte] = req.query.due_date_from;
      if (req.query.due_date_to) where.due_date[Op.lte] = req.query.due_date_to;
    }

    const rows = await FeeInvoiceV1.findAll({
      where,
      include: [{ model: FeeInvoiceItemV1, as: 'items' }],
      order: [['due_date', 'ASC']]
    });

    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'Student profile not found for this account.' });
      }
      where.student_id = authenticatedStudentId;
    }

    const row = await FeeInvoiceV1.findOne({
      where,
      include: [
        { model: FeeInvoiceItemV1, as: 'items' },
        { model: FeePaymentV1, as: 'payments' }
      ]
    });

    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Invoice not found' });

    const status = deriveInvoiceStatus({
      balance: row.balance_amount,
      dueDate: row.due_date,
      waived: row.status === 'waived',
      cancelled: row.status === 'cancelled'
    });

    if (status !== row.status && row.status !== 'paid' && row.status !== 'partial') {
      await row.update({ status });
    }

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const generateInvoices = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { student_ids, installment_plan_id, academic_year_id, due_date } = req.body;

    if (installment_plan_id && Array.isArray(student_ids) && student_ids.length > 0) {
      const installment = await InstallmentPlanV1.findByPk(installment_plan_id, { transaction });
      if (!installment) {
        await transaction.rollback();
        return fail(res, { statusCode: 404, code: 'installment_not_found', message: 'Installment plan not found' });
      }

      const assignments = await StudentFeeAssignmentV1.findAll({
        where: {
          student_id: { [Op.in]: student_ids },
          fee_structure_id: installment.fee_structure_id,
          status: 'active'
        },
        transaction
      });

      let generated = 0;
      for (const assignment of assignments) {
        // eslint-disable-next-line no-await-in-loop
        await createInvoiceForAssignmentInstallment({ assignment, installment, transaction });
        generated += 1;
      }

      await transaction.commit();
      return ok(res, { generated_count: generated });
    }

    if (academic_year_id) {
      await transaction.rollback();
      const result = await generateInvoicesForDate({ dueDate: due_date || new Date() });
      return ok(res, result);
    }

    await transaction.rollback();
    return fail(res, {
      statusCode: 422,
      code: 'invalid_payload',
      message: 'Provide either {student_ids + installment_plan_id} or {academic_year_id}.'
    });
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'generate_invoice_failed', message: error.message });
  }
};

const listStudentInvoices = async (req, res) => {
  try {
    const requestedStudentId = Number(req.params.studentId);
    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId || authenticatedStudentId !== requestedStudentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'You can only access your own invoices.' });
      }
    }

    const rows = await FeeInvoiceV1.findAll({
      where: { student_id: requestedStudentId },
      include: [{ model: FeeInvoiceItemV1, as: 'items' }],
      order: [['due_date', 'DESC']]
    });

    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const waiveInvoice = async (req, res) => {
  try {
    const row = await FeeInvoiceV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Invoice not found' });

    await row.update({
      status: 'waived',
      balance_amount: 0,
      waived_by: req.user.id,
      waiver_reason: req.body.reason || 'Waived by principal'
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  listInvoices,
  getInvoiceById,
  generateInvoices,
  listStudentInvoices,
  waiveInvoice
};

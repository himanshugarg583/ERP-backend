const sequelize = require('../../../config/db');
const { Op } = require('sequelize');
const {
  FeeInvoiceV1,
  FeeInvoiceItemV1,
  FeePaymentV1,
  StudentFeeAssignmentV1,
  FeeStructureV1,
  InstallmentPlanV1
} = require('../../../models');
const { Student } = require('../../../models/admin/students');
const { ok, fail } = require('../../../utils/response');
const { createInvoiceForAssignmentInstallment, generateInvoicesForDate } = require('../../../services/fees/v1/invoiceService');
const { calculateLateFine, round2, deriveInvoiceStatus } = require('../../../services/fees/v1/feeRulesService');

const buildInstallmentMap = async (invoices) => {
  const ids = Array.from(new Set(invoices.map((row) => row.installment_plan_id).filter(Boolean)));
  if (ids.length === 0) return new Map();

  const installments = await InstallmentPlanV1.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'name', 'installment_number', 'due_date', 'start_date', 'late_fine_type', 'late_fine_value']
  });

  return new Map(installments.map((inst) => [inst.id, inst]));
};

const resolveFineRule = (installment, dueDate) => {
  const rawType = installment?.late_fine_type || 'none';
  const fineValue = Number(installment?.late_fine_value || 0);
  const isOverdue = new Date().toISOString().slice(0, 10) > String(dueDate);
  const calculationType = rawType !== 'none' ? rawType : (fineValue > 0 && isOverdue ? 'per_day' : 'none');
  const displayFineType = calculationType === 'per_day' ? 'percentage' : calculationType;

  return {
    calculation_type: calculationType,
    fine_type: displayFineType,
    due_date: dueDate,
    is_overdue: isOverdue
  };
};

const attachComputedFine = async (rows, now = new Date()) => {
  const list = Array.isArray(rows) ? rows : [rows];
  const installmentMap = await buildInstallmentMap(list);

  return list.map((row) => {
    const invoice = row?.toJSON ? row.toJSON() : row;
    const installment = installmentMap.get(invoice.installment_plan_id) || null;
    const dueDate = installment?.due_date || invoice.due_date;
    const fineRule = resolveFineRule(installment, dueDate);
    const fineValue = Number(installment?.late_fine_value || 0);
    const computedFine = dueDate
      ? calculateLateFine({
        dueDate,
        graceDays: 0,
        fineType: fineRule.calculation_type,
        fineValue,
        maxFine: null,
        paymentDate: now
      })
      : 0;

    const payable = round2(Number(invoice.net_amount) + Number(computedFine) - Number(invoice.paid_amount));

    return {
      ...invoice,
      installment,
      fine_rule: installment ? fineRule : null,
      computed_fine: computedFine,
      payable_amount: Math.max(0, payable)
    };
  });
};

const formatSimpleInvoice = (invoice) => ({
  invoice_id: invoice.id,
  invoice_number: invoice.invoice_number,
  invoice_no: invoice.invoice_no,
  installment_plan_id: invoice.installment_plan_id,
  installment_name: invoice.installment?.name || null,
  installment_number: invoice.installment?.installment_number || null,
  due_date: invoice.due_date,
  start_date: invoice.start_date,
  status: invoice.status,
  gross_amount: Number(invoice.gross_amount),
  concession_amount: Number(invoice.concession_amount),
  net_amount: Number(invoice.net_amount),
  paid_amount: Number(invoice.paid_amount),
  balance_amount: Number(invoice.balance_amount),
  fine_type: invoice.fine_rule?.fine_type || null,
  calculated_fine: Number(invoice.computed_fine || 0),
  payable_amount: Number(invoice.payable_amount || 0)
});

const resolveStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return student ? Number(student.id) : null;
};

const listInvoices = async (req, res) => {
  try {
    const where = {};
    const assignmentInclude = {
      model: StudentFeeAssignmentV1,
      as: 'assignment',
      required: false,
      include: [{
        model: FeeStructureV1,
        as: 'feeStructure',
        required: false,
        attributes: ['id', 'academic_year_id']
      }],
      attributes: ['id', 'fee_structure_id']
    };

    if (req.query.student_id) where.student_id = Number(req.query.student_id);
    if (req.query.status) where.status = req.query.status;
    if (req.query.academic_year_id) {
      assignmentInclude.required = true;
      assignmentInclude.include[0].required = true;
      assignmentInclude.include[0].where = { academic_year_id: Number(req.query.academic_year_id) };
    }

    if (req.query.due_date_from || req.query.due_date_to) {
      where.due_date = {};
      if (req.query.due_date_from) where.due_date[Op.gte] = req.query.due_date_from;
      if (req.query.due_date_to) where.due_date[Op.lte] = req.query.due_date_to;
    }

    const rows = await FeeInvoiceV1.findAll({
      where,
      include: [{ model: FeeInvoiceItemV1, as: 'items' }, assignmentInclude],
      order: [['due_date', 'ASC']]
    });
    const data = await attachComputedFine(rows);

    return ok(res, data, { total: rows.length });
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

    const [data] = await attachComputedFine(row);
    return ok(res, data);
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

    if (academic_year_id || due_date) {
      await transaction.rollback();
      const result = await generateInvoicesForDate({ dueDate: due_date || new Date() });
      return ok(res, result);
    }

    await transaction.rollback();
    return fail(res, {
      statusCode: 422,
      code: 'invalid_payload',
      message: 'Provide either {student_ids + installment_plan_id} or {academic_year_id/due_date}.'
    });
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'generate_invoice_failed', message: error.message });
  }
};

const listStudentInvoices = async (req, res) => {
  try {
    const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
    if (!authenticatedStudentId) {
      return fail(res, { statusCode: 403, code: 'forbidden', message: 'Student profile not found for this account.' });
    }

    const rows = await FeeInvoiceV1.findAll({
      where: { student_id: authenticatedStudentId },
      include: [{ model: FeeInvoiceItemV1, as: 'items' }],
      order: [['due_date', 'DESC']]
    });
    const data = await attachComputedFine(rows);

    return ok(res, data, { total: rows.length });
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

const getStudentUnpaidInvoices = async (req, res) => {
  try {
    const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
    if (!authenticatedStudentId) {
      return fail(res, { statusCode: 403, code: 'forbidden', message: 'Student profile not found for this account.' });
    }

    const rows = await FeeInvoiceV1.findAll({
      where: {
        student_id: authenticatedStudentId,
        status: {
          [Op.notIn]: ['paid', 'waived', 'cancelled']
        }
      },
      include: [{
        model: InstallmentPlanV1,
        as: 'installment',
        attributes: ['id', 'name', 'installment_number', 'due_date', 'start_date', 'late_fine_type', 'late_fine_value']
      }],
      order: [['due_date', 'ASC']]
    });
    const data = (await attachComputedFine(rows)).map(formatSimpleInvoice);

    return ok(res, data, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  listInvoices,
  getInvoiceById,
  generateInvoices,
  listStudentInvoices,
  getStudentUnpaidInvoices,
  waiveInvoice
};

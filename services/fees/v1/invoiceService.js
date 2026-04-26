const sequelize = require('../../../config/db');
const {
  FeeStructureItemV1,
  StudentFeeAssignmentV1,
  InstallmentPlanV1,
  StudentConcessionV1,
  FeeInvoiceV1,
  FeeInvoiceItemV1
} = require('../../../models');
const { nextInvoiceNumber } = require('./numberSeriesService');
const { computeConcessionForItem, round2, deriveInvoiceStatus } = require('./feeRulesService');

const buildAssignmentAmountMap = async (assignment, transaction) => {
  const items = await FeeStructureItemV1.findAll({
    where: { fee_structure_id: assignment.fee_structure_id },
    order: [['sort_order', 'ASC']],
    transaction
  });

  const overrideJson = assignment.override_json || {};
  const customItems = overrideJson.custom_items || assignment.custom_items || {};
  const excludedHeads = overrideJson.excluded_heads || assignment.excluded_heads || [];
  const excluded = new Set(Array.isArray(excludedHeads) ? excludedHeads : []);

  return items
    .filter((item) => !excluded.has(item.fee_head_id))
    .map((item) => ({
      fee_head_id: item.fee_head_id,
      annual_amount: Number(customItems[item.fee_head_id] ?? item.amount),
      is_mandatory: item.is_mandatory
    }));
};

const getApprovedConcessions = async (assignment, transaction) => {
  const studentConcessions = await StudentConcessionV1.findAll({
    where: {
      student_id: assignment.student_id,
      academic_year_id: assignment.academic_year_id,
      approval_status: 'approved'
    },
    transaction
  });

  return studentConcessions;
};

const createInvoiceForAssignmentInstallment = async ({ assignment, installment, transaction }) => {
  const existing = await FeeInvoiceV1.findOne({
    where: {
      student_id: assignment.student_id,
      installment_plan_id: installment.id
    },
    transaction
  });

  if (existing) return existing;

  const amountMap = await buildAssignmentAmountMap(assignment, transaction);
  const concessions = await getApprovedConcessions(assignment, transaction);

  const byHeadConcessions = new Map();
  const invoiceLevelConcessions = [];

  for (const entry of concessions) {
    // With 14-table core mode, student_concessions are treated as flat approved waivers.
    if (entry.fee_head_id) {
      const list = byHeadConcessions.get(entry.fee_head_id) || [];
      list.push({ type: 'flat_amount', value: 0, applies_to: 'specific_head' });
      byHeadConcessions.set(entry.fee_head_id, list);
      continue;
    }

    invoiceLevelConcessions.push({ type: 'flat_amount', value: 0, applies_to: 'total_invoice' });
  }

  const grossItems = amountMap.map((row) => {
    const gross = round2((row.annual_amount * Number(installment.percentage)) / 100);
    const headConcession = computeConcessionForItem({
      gross,
      concessions: byHeadConcessions.get(row.fee_head_id) || []
    });

    return {
      fee_head_id: row.fee_head_id,
      gross_amount: gross,
      concession_amount: headConcession,
      net_amount: round2(gross - headConcession)
    };
  });

  const grossAmount = round2(grossItems.reduce((acc, row) => acc + Number(row.gross_amount), 0));
  const itemConcessionAmount = round2(grossItems.reduce((acc, row) => acc + Number(row.concession_amount), 0));

  let invoiceLevelConcessionAmount = 0;
  for (const c of invoiceLevelConcessions) {
    if (c.applies_to === 'total_invoice') {
      if (c.type === 'full_waiver') {
        invoiceLevelConcessionAmount = grossAmount;
        break;
      }

      if (c.type === 'percentage') {
        invoiceLevelConcessionAmount += (grossAmount * Number(c.value || 0)) / 100;
      }

      if (c.type === 'flat_amount') {
        invoiceLevelConcessionAmount += Number(c.value || 0);
      }
    }
  }

  let concessionAmount = round2(itemConcessionAmount + invoiceLevelConcessionAmount);
  concessionAmount = Math.min(concessionAmount, grossAmount);

  let netAmount = round2(grossAmount - concessionAmount);

  const invoiceNumber = await nextInvoiceNumber(transaction);
  const status = deriveInvoiceStatus({ balance: netAmount, dueDate: installment.due_date });

  const invoice = await FeeInvoiceV1.create({
    invoice_number: invoiceNumber,
    invoice_no: invoiceNumber,
    student_id: assignment.student_id,
    assignment_id: assignment.id,
    installment_plan_id: installment.id,
    academic_year_id: assignment.academic_year_id,
    gross_amount: grossAmount,
    concession_amount: concessionAmount,
    net_amount: netAmount,
    fine_amount: 0,
    paid_amount: 0,
    balance_amount: netAmount,
    status,
    start_date: installment.start_date || installment.due_date,
    source_type: 'system',
    due_date: installment.due_date,
    generated_at: new Date()
  }, { transaction });

  const invoiceItems = grossItems.map((row) => ({
    invoice_id: invoice.id,
    fee_head_id: row.fee_head_id,
    gross_amount: row.gross_amount,
    concession_amount: round2(row.concession_amount),
    net_amount: row.net_amount
  }));

  await FeeInvoiceItemV1.bulkCreate(invoiceItems, { transaction });

  return invoice;
};

const generateInvoicesForDate = async ({ dueDate = new Date() }) => {
  const dateOnly = new Date(dueDate);
  const yyyyMmDd = dateOnly.toISOString().split('T')[0];

  const installments = await InstallmentPlanV1.findAll({
    where: { due_date: yyyyMmDd }
  });

  const transaction = await sequelize.transaction();
  try {
    let generated = 0;

    const activeAssignments = await StudentFeeAssignmentV1.findAll({
      where: { status: 'active' },
      transaction
    });

    for (const installment of installments) {
      const matchingAssignments = activeAssignments.filter((a) => a.fee_structure_id === installment.fee_structure_id);
      for (const assignment of matchingAssignments) {
        // eslint-disable-next-line no-await-in-loop
        const invoice = await createInvoiceForAssignmentInstallment({ assignment, installment, transaction });
        if (invoice) generated += 1;
      }
    }

    await transaction.commit();
    return { generated_count: generated };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  createInvoiceForAssignmentInstallment,
  generateInvoicesForDate
};

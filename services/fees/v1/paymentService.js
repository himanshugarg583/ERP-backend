const { calculateLateFine, round2, deriveInvoiceStatus } = require('./feeRulesService');
const {
  FeeInvoiceV1,
  FeePaymentV1,
  InstallmentPlanV1,
  SchoolFeeSettingV1,
  StudentWalletV1
} = require('../../../models/admin/fees_v1');
const { nextReceiptNumber } = require('./numberSeriesService');

const refreshInvoiceFine = async (invoice, paymentDate, transaction) => {
  const installment = await InstallmentPlanV1.findByPk(invoice.installment_plan_id, { transaction });
  if (!installment) return 0;

  const fine = calculateLateFine({
    dueDate: invoice.due_date,
    graceDays: installment.grace_period_days,
    fineType: installment.late_fine_type,
    fineValue: installment.late_fine_value,
    maxFine: installment.max_late_fine,
    paymentDate
  });

  await invoice.update({ fine_amount: fine }, { transaction });
  return fine;
};

const getFineFirstSetting = async (transaction) => {
  const setting = await SchoolFeeSettingV1.findOne({ transaction });
  return setting ? Boolean(setting.fine_first) : true;
};

const applyPaymentToInvoice = async ({
  invoice,
  amount,
  paymentMode,
  transactionRef,
  paymentGateway,
  gatewayPaymentId,
  collectedBy,
  notes,
  chequeDate,
  chequeBank,
  chequeStatus,
  paidAt,
  transaction
}) => {
  const date = paidAt ? new Date(paidAt) : new Date();
  const fineAmount = await refreshInvoiceFine(invoice, date, transaction);

  const totalDueBefore = round2(Number(invoice.net_amount) + Number(fineAmount) - Number(invoice.paid_amount));
  const amountIncoming = round2(Number(amount));

  let applyAmount = Math.min(amountIncoming, totalDueBefore);
  let overpay = round2(amountIncoming - applyAmount);

  const fineRemaining = round2(Number(fineAmount));
  const principalRemaining = round2(Number(invoice.net_amount) - Number(invoice.paid_amount));

  const fineFirst = await getFineFirstSetting(transaction);

  let finePaid = 0;
  let principalPaid = 0;

  if (fineFirst) {
    finePaid = Math.min(applyAmount, fineRemaining);
    applyAmount = round2(applyAmount - finePaid);
    principalPaid = Math.min(applyAmount, principalRemaining);
    applyAmount = round2(applyAmount - principalPaid);
  } else {
    principalPaid = Math.min(applyAmount, principalRemaining);
    applyAmount = round2(applyAmount - principalPaid);
    finePaid = Math.min(applyAmount, fineRemaining);
    applyAmount = round2(applyAmount - finePaid);
  }

  const newPaidAmount = round2(Number(invoice.paid_amount) + principalPaid);
  const newBalance = round2(Number(invoice.net_amount) + Number(fineAmount) - newPaidAmount - finePaid);
  const newStatus = deriveInvoiceStatus({ balance: newBalance, dueDate: invoice.due_date });

  await invoice.update({
    paid_amount: newPaidAmount,
    balance_amount: Math.max(0, newBalance),
    fine_amount: fineAmount,
    status: Math.max(0, newBalance) === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : newStatus
  }, { transaction });

  const receiptNumber = await nextReceiptNumber(transaction);

  const payment = await FeePaymentV1.create({
    receipt_number: receiptNumber,
    invoice_id: invoice.id,
    student_id: invoice.student_id,
    amount_paid: principalPaid,
    fine_paid: finePaid,
    payment_mode: paymentMode,
    transaction_ref: transactionRef || null,
    payment_gateway: paymentGateway || null,
    gateway_payment_id: gatewayPaymentId || null,
    collected_by: collectedBy,
    paid_at: date,
    cheque_date: chequeDate || null,
    cheque_bank: chequeBank || null,
    cheque_status: chequeStatus || null,
    notes: notes || null,
    is_cancelled: false
  }, { transaction });

  if (overpay > 0) {
    const [wallet] = await StudentWalletV1.findOrCreate({
      where: { student_id: invoice.student_id },
      defaults: { balance: 0 },
      transaction
    });

    await wallet.update({ balance: round2(Number(wallet.balance) + overpay) }, { transaction });
  }

  return {
    payment,
    invoice,
    overpay
  };
};

module.exports = {
  applyPaymentToInvoice,
  refreshInvoiceFine
};

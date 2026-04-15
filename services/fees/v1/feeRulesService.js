const { Op } = require('sequelize');

const round2 = (value) => Number(parseFloat(value || 0).toFixed(2));

const calculateLateFine = ({ dueDate, graceDays = 0, fineType = 'none', fineValue = 0, maxFine = null, paymentDate = new Date() }) => {
  if (fineType === 'none') return 0;

  const due = new Date(dueDate);
  const paid = new Date(paymentDate);
  due.setHours(0, 0, 0, 0);
  paid.setHours(0, 0, 0, 0);

  const diffMs = paid.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) - Number(graceDays || 0);
  const effectiveDays = Math.max(0, diffDays);

  let fine = 0;
  if (fineType === 'flat') {
    fine = effectiveDays > 0 ? Number(fineValue || 0) : 0;
  } else if (fineType === 'per_day') {
    fine = effectiveDays * Number(fineValue || 0);
  }

  if (maxFine !== null && maxFine !== undefined) {
    fine = Math.min(fine, Number(maxFine));
  }

  return round2(fine);
};

const sumInstallmentPercentages = (installments = []) => {
  const total = installments.reduce((acc, row) => acc + Number(row.percentage || 0), 0);
  return round2(total);
};

const validateInstallmentPercentages = (installments = []) => {
  const total = sumInstallmentPercentages(installments);
  if (total !== 100) {
    const err = new Error(`Installment percentages must sum to 100%. Current total: ${total}%`);
    err.statusCode = 422;
    throw err;
  }
};

const computeConcessionForItem = ({ gross, concessions = [] }) => {
  let concession = 0;
  const amount = Number(gross || 0);

  for (const c of concessions) {
    if (c.type === 'full_waiver') {
      concession = amount;
      break;
    }

    if (c.type === 'percentage') {
      concession += (amount * Number(c.value || 0)) / 100;
      continue;
    }

    if (c.type === 'flat_amount') {
      concession += Number(c.value || 0);
    }
  }

  return Math.min(round2(concession), round2(amount));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const deriveInvoiceStatus = ({ balance, dueDate, waived = false, cancelled = false }) => {
  const bal = Number(balance || 0);
  if (cancelled) return 'cancelled';
  if (waived) return 'waived';
  if (bal <= 0) return 'paid';

  const now = new Date();
  const due = new Date(dueDate);
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (now > due) return 'overdue';
  return 'active';
};

module.exports = {
  Op,
  round2,
  clamp,
  calculateLateFine,
  sumInstallmentPercentages,
  validateInstallmentPercentages,
  computeConcessionForItem,
  deriveInvoiceStatus
};

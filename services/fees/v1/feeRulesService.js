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

const validateInstallmentPercentages = (installments = [], options = {}) => {
  const total = sumInstallmentPercentages(installments);
  const tolerance = options.tolerance !== undefined ? Number(options.tolerance) : 0.01;
  if (Math.abs(total - 100) > tolerance) {
    const err = new Error('Total installment percentage must be 100%.');
    err.statusCode = 422;
    throw err;
  }
};

const validateInstallmentAmountsAgainstTotal = ({ installments = [], totalAmount = 0 }) => {
  const structureTotal = round2(totalAmount);
  const computedInstallmentTotal = round2(
    installments.reduce((acc, row) => {
      const hasFixedAmount = row.fixed_amount !== undefined && row.fixed_amount !== null && row.fixed_amount !== '';
      if (hasFixedAmount) return acc + Number(row.fixed_amount || 0);
      return acc + (structureTotal * Number(row.percentage || 0)) / 100;
    }, 0)
  );

  if (computedInstallmentTotal !== structureTotal) {
    const err = new Error('Total installment amount must be equal to total fee amount.');
    err.statusCode = 422;
    throw err;
  }
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const normalizeInstallmentsAgainstTotal = ({ installments = [], totalAmount = 0 }) => {
  const structureTotal = round2(totalAmount);
  const hasAnyPercentage = installments.some((row) => hasValue(row.percentage));
  const hasAnyFixed = installments.some((row) => hasValue(row.fixed_amount));
  const inputMode = hasAnyPercentage && !hasAnyFixed
    ? 'percentage'
    : (!hasAnyPercentage && hasAnyFixed ? 'amount' : 'mixed');

  const normalized = installments.map((row, index) => {
    const hasFixed = hasValue(row.fixed_amount);
    const hasPercentage = hasValue(row.percentage);

    if (!hasFixed && !hasPercentage) {
      const err = new Error('Each installment must include either percentage or fixed_amount.');
      err.statusCode = 422;
      throw err;
    }

    let percentage = hasPercentage ? Number(row.percentage) : null;
    let fixedAmount = hasFixed ? round2(row.fixed_amount) : null;

    if (structureTotal === 0) {
      if (fixedAmount !== null && fixedAmount !== 0) {
        const err = new Error('Installment fixed_amount must be 0 when total amount is 0.');
        err.statusCode = 422;
        throw err;
      }

      fixedAmount = 0;
      if (percentage === null) percentage = 0;
    } else if (hasFixed && !hasPercentage) {
      percentage = round2((fixedAmount / structureTotal) * 100);
    } else if (!hasFixed && hasPercentage) {
      fixedAmount = round2((structureTotal * Number(percentage || 0)) / 100);
    } else {
      const expectedFixed = round2((structureTotal * Number(percentage || 0)) / 100);
      if (expectedFixed !== fixedAmount) {
        const err = new Error(`Installment ${row.name || index + 1} fixed_amount does not match percentage.`);
        err.statusCode = 422;
        throw err;
      }
    }

    return {
      ...row,
      percentage,
      fixed_amount: fixedAmount
    };
  });

  if (inputMode === 'percentage') {
    validateInstallmentPercentages(normalized);
  } else if (inputMode === 'amount') {
    validateInstallmentAmountsAgainstTotal({ installments: normalized, totalAmount: structureTotal });
  } else {
    validateInstallmentPercentages(normalized);
    validateInstallmentAmountsAgainstTotal({ installments: normalized, totalAmount: structureTotal });
  }

  return normalized;
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
  validateInstallmentAmountsAgainstTotal,
  normalizeInstallmentsAgainstTotal,
  computeConcessionForItem,
  deriveInvoiceStatus
};

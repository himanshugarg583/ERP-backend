const sequelize = require('../../../config/db');
const { FeeInvoiceV1, FeePaymentV1 } = require('../../../models');

const extractLastSerial = (value) => {
  if (!value || typeof value !== 'string') return 0;
  const parts = value.split('-');
  const last = parts[parts.length - 1];
  const n = Number(last);
  return Number.isFinite(n) ? n : 0;
};

const nextInvoiceNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const lastInvoice = await FeeInvoiceV1.findOne({
    order: [['id', 'DESC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  let num = extractLastSerial(lastInvoice?.invoice_no || lastInvoice?.invoice_number) + 1;
  let candidate = `INV-${year}-${String(num).padStart(6, '0')}`;

  while (await FeeInvoiceV1.findOne({ where: { invoice_number: candidate }, transaction })) {
    num += 1;
    candidate = `INV-${year}-${String(num).padStart(6, '0')}`;
  }

  return candidate;
};

const nextReceiptNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const lastPayment = await FeePaymentV1.findOne({
    order: [['created_at', 'DESC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  const num = extractLastSerial(lastPayment?.receipt_no || lastPayment?.receipt_number) + 1;
  return `RCP-${year}-${String(num).padStart(6, '0')}`;
};

module.exports = {
  nextInvoiceNumber,
  nextReceiptNumber
};

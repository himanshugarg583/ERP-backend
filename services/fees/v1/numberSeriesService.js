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
    order: [['created_at', 'DESC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  const num = extractLastSerial(lastInvoice?.invoice_no || lastInvoice?.invoice_number) + 1;
  return `INV-${year}-${String(num).padStart(6, '0')}`;
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

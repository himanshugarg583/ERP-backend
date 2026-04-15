const sequelize = require('../../../config/db');
const { FeeNumberSequenceV1 } = require('../../../models/admin/fees_v1');

const sequenceKeys = {
  invoice: 'invoice',
  receipt: 'receipt'
};

const getNextNumber = async (key, transaction) => {
  const sequence = await FeeNumberSequenceV1.findOne({
    where: { key_name: key },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!sequence) {
    throw new Error(`Missing number sequence for key: ${key}`);
  }

  const nextValue = Number(sequence.last_value) + 1;
  await sequence.update({ last_value: nextValue }, { transaction });
  return nextValue;
};

const nextInvoiceNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const num = await getNextNumber(sequenceKeys.invoice, transaction);
  return `INV-${year}-${String(num).padStart(6, '0')}`;
};

const nextReceiptNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const num = await getNextNumber(sequenceKeys.receipt, transaction);
  return `RCP-${year}-${String(num).padStart(6, '0')}`;
};

module.exports = {
  nextInvoiceNumber,
  nextReceiptNumber
};

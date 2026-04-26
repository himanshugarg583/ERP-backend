const crypto = require('crypto');
const Razorpay = require('razorpay');
const sequelize = require('../../../config/db');
const {
  FeeInvoiceV1,
  FeePaymentV1
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');
const { applyPaymentToInvoice } = require('../../../services/fees/v1/paymentService');
const { sendReceiptEmailAndLog } = require('../../../services/fees/v1/notificationService');
const { deriveInvoiceStatus } = require('../../../services/fees/v1/feeRulesService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const resolveInvoiceNo = (invoice) => invoice?.invoice_no || invoice?.invoice_number;
const resolveReceiptNo = (payment) => payment?.receipt_no || payment?.receipt_number;

const resolveStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return student ? Number(student.id) : null;
};

const collectPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { invoice_id, amount_paid, payment_mode, transaction_ref, notes, cheque_date, cheque_bank } = req.body;

    const invoice = await FeeInvoiceV1.findByPk(invoice_id, { transaction });
    if (!invoice) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'invoice_not_found', message: 'Invoice not found' });
    }

    if (['waived', 'cancelled'].includes(invoice.status)) {
      await transaction.rollback();
      return fail(res, { statusCode: 409, code: 'invoice_closed', message: 'Invoice is not payable.' });
    }

    if (Number(amount_paid) <= 0) {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_amount', message: 'amount_paid must be greater than zero.' });
    }

    if (payment_mode === 'cheque' && (!cheque_date || !cheque_bank || !transaction_ref)) {
      await transaction.rollback();
      return fail(res, {
        statusCode: 422,
        code: 'invalid_cheque_payload',
        message: 'cheque_date, cheque_bank and transaction_ref are required for cheque payments.'
      });
    }

    const { payment } = await applyPaymentToInvoice({
      invoice,
      amount: amount_paid,
      paymentMode: payment_mode,
      transactionRef: transaction_ref,
      collectedBy: req.user.id,
      notes,
      chequeDate: cheque_date,
      chequeBank: cheque_bank,
      chequeStatus: payment_mode === 'cheque' ? 'pending' : null,
      paidAt: new Date(),
      transaction
    });

    await transaction.commit();

    await sendReceiptEmailAndLog({
      invoiceId: invoice.id,
      studentId: invoice.student_id,
      receiptNumber: resolveReceiptNo(payment),
      amount: payment.amount_paid,
      fine: payment.fine_paid,
      mode: payment.payment_mode,
      invoiceNumber: resolveInvoiceNo(invoice)
    });

    return ok(res, payment, {
      receipt_number: payment.receipt_number,
      receipt_no: resolveReceiptNo(payment)
    }, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'collect_payment_failed', message: error.message });
  }
};

const initiateOnlinePayment = async (req, res) => {
  try {
    return fail(res, {
      statusCode: 501,
      code: 'online_payment_disabled',
      message: 'Online payment flow is currently disabled in 14-table fee core mode.'
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'initiate_online_failed', message: error.message });
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: 'Razorpay webhook is disabled in 14-table fee core mode.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'Student profile not found for this account.' });
      }
      where.student_id = authenticatedStudentId;
    }

    const row = await FeePaymentV1.findOne({
      where,
      include: [{ model: FeeInvoiceV1, as: 'invoice' }]
    });

    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Payment not found' });
    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const getReceipt = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'Student profile not found for this account.' });
      }
      where.student_id = authenticatedStudentId;
    }

    const payment = await FeePaymentV1.findOne({ where, include: [{ model: FeeInvoiceV1, as: 'invoice' }] });
    if (!payment) return fail(res, { statusCode: 404, code: 'not_found', message: 'Payment not found' });

    const receipt = {
      receipt_number: payment.receipt_number,
      receipt_no: resolveReceiptNo(payment),
      cancelled: payment.is_cancelled,
      invoice_number: payment.invoice?.invoice_number,
      invoice_no: resolveInvoiceNo(payment.invoice),
      payment_mode: payment.payment_mode,
      amount_paid: payment.amount_paid,
      fine_paid: payment.fine_paid,
      paid_at: payment.paid_at,
      student_id: payment.student_id,
      cancellation_reason: payment.cancellation_reason || null
    };

    return ok(res, receipt);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const sendReceipt = async (req, res) => {
  try {
    const payment = await FeePaymentV1.findByPk(req.params.id, { include: [{ model: FeeInvoiceV1, as: 'invoice' }] });
    if (!payment) return fail(res, { statusCode: 404, code: 'not_found', message: 'Payment not found' });

    await sendReceiptEmailAndLog({
      invoiceId: payment.invoice_id,
      studentId: payment.student_id,
      receiptNumber: resolveReceiptNo(payment),
      amount: payment.amount_paid,
      fine: payment.fine_paid,
      mode: payment.payment_mode,
      invoiceNumber: resolveInvoiceNo(payment.invoice)
    });

    return ok(res, { sent: true });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'send_receipt_failed', message: error.message });
  }
};

const cancelPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const payment = await FeePaymentV1.findByPk(req.params.id, { transaction });
    if (!payment) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'not_found', message: 'Payment not found' });
    }

    if (payment.is_cancelled) {
      await transaction.rollback();
      return fail(res, { statusCode: 409, code: 'already_cancelled', message: 'Payment already cancelled' });
    }

    const paidDate = new Date(payment.paid_at);
    const today = new Date();
    if (paidDate.toDateString() !== today.toDateString()) {
      await transaction.rollback();
      return fail(res, {
        statusCode: 409,
        code: 'cancel_window_over',
        message: 'Payment cancellation allowed only on same day before day-end lock.'
      });
    }

    const invoice = await FeeInvoiceV1.findByPk(payment.invoice_id, { transaction });
    if (!invoice) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'invoice_not_found', message: 'Invoice not found' });
    }

    const restoredPaid = Math.max(0, Number(invoice.paid_amount) - Number(payment.amount_paid));
    const restoredBalance = Number(invoice.net_amount) + Number(invoice.fine_amount) - restoredPaid;
    const restoredStatus = deriveInvoiceStatus({ balance: restoredBalance, dueDate: invoice.due_date });

    await invoice.update({
      paid_amount: restoredPaid,
      balance_amount: restoredBalance,
      status: restoredBalance > 0 ? restoredStatus : 'paid'
    }, { transaction });

    await payment.update({
      is_cancelled: true,
      cancelled_by: req.user.id,
      cancelled_at: new Date(),
      cancellation_reason: req.body.reason || 'Cancelled manually'
    }, { transaction });

    await transaction.commit();
    return ok(res, payment);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'cancel_payment_failed', message: error.message });
  }
};

const updateChequeStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const payment = await FeePaymentV1.findByPk(req.params.id, { transaction });
    if (!payment) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'not_found', message: 'Payment not found' });
    }

    if (payment.payment_mode !== 'cheque') {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_mode', message: 'Only cheque payments can update cheque status.' });
    }

    const nextStatus = req.body.cheque_status;
    if (!['pending', 'cleared', 'bounced'].includes(nextStatus)) {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_status', message: 'Invalid cheque status.' });
    }

    const invoice = await FeeInvoiceV1.findByPk(payment.invoice_id, { transaction });
    if (!invoice) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'invoice_not_found', message: 'Invoice not found' });
    }

    if (nextStatus === 'bounced' && !payment.is_cancelled) {
      const restoredPaid = Math.max(0, Number(invoice.paid_amount) - Number(payment.amount_paid));
      const restoredBalance = Number(invoice.net_amount) + Number(invoice.fine_amount) - restoredPaid;
      const restoredStatus = deriveInvoiceStatus({ balance: restoredBalance, dueDate: invoice.due_date });

      await invoice.update({
        paid_amount: restoredPaid,
        balance_amount: restoredBalance,
        status: restoredBalance > 0 ? restoredStatus : 'paid'
      }, { transaction });

      await payment.update({
        cheque_status: 'bounced',
        is_cancelled: true,
        cancelled_by: req.user.id,
        cancelled_at: new Date(),
        cancellation_reason: 'Cheque bounced'
      }, { transaction });
    } else {
      await payment.update({ cheque_status: nextStatus }, { transaction });
    }

    await transaction.commit();
    return ok(res, payment);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'cheque_status_failed', message: error.message });
  }
};

module.exports = {
  collectPayment,
  initiateOnlinePayment,
  razorpayWebhook,
  getPaymentById,
  getReceipt,
  sendReceipt,
  cancelPayment,
  updateChequeStatus
};

const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');
const {
  FeeInvoiceV1,
  FeePaymentV1,
  FeeGatewayOrderV1,
  FeeWebhookEventV1
} = require('../../../models/admin/fees_v1');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');
const { applyPaymentToInvoice } = require('../../../services/fees/v1/paymentService');
const { sendReceiptEmailAndLog } = require('../../../services/fees/v1/notificationService');
const { deriveInvoiceStatus } = require('../../../services/fees/v1/feeRulesService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
      receiptNumber: payment.receipt_number,
      amount: payment.amount_paid,
      fine: payment.fine_paid,
      mode: payment.payment_mode,
      invoiceNumber: invoice.invoice_number
    });

    return ok(res, payment, { receipt_number: payment.receipt_number }, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'collect_payment_failed', message: error.message });
  }
};

const initiateOnlinePayment = async (req, res) => {
  try {
    const { invoice_id, amount } = req.body;
    const invoice = await FeeInvoiceV1.findByPk(invoice_id);

    if (!invoice) return fail(res, { statusCode: 404, code: 'invoice_not_found', message: 'Invoice not found' });

    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId || authenticatedStudentId !== Number(invoice.student_id)) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'You can only initiate payment for your own invoices.' });
      }
    }

    const now = new Date();
    const existingOrder = await FeeGatewayOrderV1.findOne({
      where: {
        invoice_id: invoice.id,
        status: 'active',
        expires_at: { [Op.gt]: now }
      },
      order: [['created_at', 'DESC']]
    });

    if (existingOrder) {
      return ok(res, {
        gateway: existingOrder.gateway,
        order_id: existingOrder.gateway_order_id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: Number(existingOrder.amount)
      });
    }

    const payableAmount = Number(amount || invoice.balance_amount);
    if (payableAmount <= 0) {
      return fail(res, { statusCode: 422, code: 'invalid_amount', message: 'Amount should be greater than 0.' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100),
      currency: 'INR',
      receipt: `INV_${invoice.invoice_number}_${Date.now()}`,
      notes: {
        invoice_id: invoice.id,
        student_id: invoice.student_id
      }
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await FeeGatewayOrderV1.create({
      invoice_id: invoice.id,
      student_id: invoice.student_id,
      gateway: 'razorpay',
      gateway_order_id: order.id,
      amount: payableAmount,
      expires_at: expiresAt,
      status: 'active'
    });

    return ok(res, {
      gateway: 'razorpay',
      order_id: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: payableAmount,
      expires_at: expiresAt
    }, null, 201);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'initiate_online_failed', message: error.message });
  }
};

const razorpayWebhook = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const payload = req.body || {};
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const payloadRaw = req.rawBody || JSON.stringify(payload);

    if (!secret) {
      await FeeWebhookEventV1.create({
        gateway: 'razorpay',
        event_id: payload?.payload?.payment?.entity?.id || null,
        event_type: payload?.event || null,
        payload,
        signature,
        status: 'failed',
        error_message: 'RAZORPAY_WEBHOOK_SECRET is not configured'
      }, { transaction });

      await transaction.commit();
      return res.status(500).json({ success: false, message: 'Webhook secret is not configured' });
    }

    const expected = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');
    if (signature !== expected) {
      await FeeWebhookEventV1.create({
        gateway: 'razorpay',
        event_id: payload?.payload?.payment?.entity?.id || null,
        event_type: payload?.event || null,
        payload,
        signature,
        status: 'rejected',
        error_message: 'Signature mismatch'
      }, { transaction });

      await transaction.commit();
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const gatewayPaymentId = payload?.payload?.payment?.entity?.id;
    const gatewayOrderId = payload?.payload?.payment?.entity?.order_id;

    const existingPayment = await FeePaymentV1.findOne({ where: { gateway_payment_id: gatewayPaymentId }, transaction });
    if (existingPayment) {
      await FeeWebhookEventV1.create({
        gateway: 'razorpay',
        event_id: gatewayPaymentId,
        event_type: payload?.event || null,
        payload,
        signature,
        status: 'ignored',
        error_message: 'Duplicate webhook/payment already recorded'
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true });
    }

    const gatewayOrder = await FeeGatewayOrderV1.findOne({ where: { gateway_order_id: gatewayOrderId }, transaction });
    if (!gatewayOrder) {
      await FeeWebhookEventV1.create({
        gateway: 'razorpay',
        event_id: gatewayPaymentId,
        event_type: payload?.event || null,
        payload,
        signature,
        status: 'failed',
        error_message: 'Gateway order not found'
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true });
    }

    const invoice = await FeeInvoiceV1.findByPk(gatewayOrder.invoice_id, { transaction });
    if (!invoice) {
      await FeeWebhookEventV1.create({
        gateway: 'razorpay',
        event_id: gatewayPaymentId,
        event_type: payload?.event || null,
        payload,
        signature,
        status: 'failed',
        error_message: 'Invoice not found'
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ success: true });
    }

    const student = await Student.findByPk(invoice.student_id, { transaction });
    const collectorUserId = student?.user_id || 1;

    const paidAmount = Number(payload?.payload?.payment?.entity?.amount || 0) / 100;

    const { payment } = await applyPaymentToInvoice({
      invoice,
      amount: paidAmount,
      paymentMode: 'online',
      transactionRef: gatewayOrder.gateway_order_id,
      paymentGateway: 'razorpay',
      gatewayPaymentId,
      collectedBy: collectorUserId,
      notes: 'Online payment webhook capture',
      paidAt: new Date(),
      transaction
    });

    await gatewayOrder.update({ status: 'paid' }, { transaction });

    await FeeWebhookEventV1.create({
      gateway: 'razorpay',
      event_id: gatewayPaymentId,
      event_type: payload?.event || null,
      payload,
      signature,
      status: 'processed'
    }, { transaction });

    await transaction.commit();

    await sendReceiptEmailAndLog({
      invoiceId: invoice.id,
      studentId: invoice.student_id,
      receiptNumber: payment.receipt_number,
      amount: payment.amount_paid,
      fine: payment.fine_paid,
      mode: payment.payment_mode,
      invoiceNumber: invoice.invoice_number
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    await transaction.rollback();
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
      cancelled: payment.is_cancelled,
      invoice_number: payment.invoice?.invoice_number,
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
      receiptNumber: payment.receipt_number,
      amount: payment.amount_paid,
      fine: payment.fine_paid,
      mode: payment.payment_mode,
      invoiceNumber: payment.invoice?.invoice_number
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

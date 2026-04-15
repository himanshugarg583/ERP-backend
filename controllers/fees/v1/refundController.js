const sequelize = require('../../../config/db');
const {
  PaymentRefundV1,
  FeePaymentV1,
  FeeInvoiceV1
} = require('../../../models/admin/fees_v1');
const { ok, fail } = require('../../../utils/response');
const { deriveInvoiceStatus } = require('../../../services/fees/v1/feeRulesService');

const initiateRefund = async (req, res) => {
  try {
    const { payment_id, refund_amount, reason, refund_mode } = req.body;

    const payment = await FeePaymentV1.findByPk(payment_id);
    if (!payment) return fail(res, { statusCode: 404, code: 'payment_not_found', message: 'Payment not found' });

    if (Number(refund_amount) <= 0 || Number(refund_amount) > Number(payment.amount_paid)) {
      return fail(res, {
        statusCode: 422,
        code: 'invalid_refund_amount',
        message: 'refund_amount must be > 0 and <= original payment amount.'
      });
    }

    const row = await PaymentRefundV1.create({
      payment_id,
      student_id: payment.student_id,
      refund_amount,
      reason,
      refund_mode,
      status: 'pending',
      requested_by: req.user.id
    });

    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'refund_create_failed', message: error.message });
  }
};

const listPendingRefunds = async (req, res) => {
  try {
    const rows = await PaymentRefundV1.findAll({ where: { status: 'pending' }, order: [['created_at', 'ASC']] });
    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'refund_list_failed', message: error.message });
  }
};

const approveRefund = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const refund = await PaymentRefundV1.findByPk(req.params.id, { transaction });
    if (!refund) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'refund_not_found', message: 'Refund request not found' });
    }

    if (refund.status !== 'pending') {
      await transaction.rollback();
      return fail(res, { statusCode: 409, code: 'invalid_refund_state', message: 'Refund request already processed.' });
    }

    const payment = await FeePaymentV1.findByPk(refund.payment_id, { transaction });
    const invoice = await FeeInvoiceV1.findByPk(payment.invoice_id, { transaction });

    const restoredPaid = Math.max(0, Number(invoice.paid_amount) - Number(refund.refund_amount));
    const restoredBalance = Number(invoice.net_amount) + Number(invoice.fine_amount) - restoredPaid;
    const restoredStatus = deriveInvoiceStatus({ balance: restoredBalance, dueDate: invoice.due_date });

    await invoice.update({
      paid_amount: restoredPaid,
      balance_amount: restoredBalance,
      status: restoredBalance > 0 ? restoredStatus : 'paid'
    }, { transaction });

    await refund.update({
      status: 'processed',
      approved_by: req.user.id,
      approved_at: new Date(),
      processed_at: new Date()
    }, { transaction });

    await transaction.commit();
    return ok(res, refund);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'refund_approve_failed', message: error.message });
  }
};

const rejectRefund = async (req, res) => {
  try {
    const refund = await PaymentRefundV1.findByPk(req.params.id);
    if (!refund) return fail(res, { statusCode: 404, code: 'refund_not_found', message: 'Refund request not found' });

    if (refund.status !== 'pending') {
      return fail(res, { statusCode: 409, code: 'invalid_refund_state', message: 'Refund request already processed.' });
    }

    await refund.update({
      status: 'rejected',
      approved_by: req.user.id,
      approved_at: new Date(),
      reason: req.body.reason || refund.reason
    });

    return ok(res, refund);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'refund_reject_failed', message: error.message });
  }
};

module.exports = {
  initiateRefund,
  listPendingRefunds,
  approveRefund,
  rejectRefund
};

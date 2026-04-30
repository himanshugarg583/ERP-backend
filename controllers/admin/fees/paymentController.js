const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');
const {
  FeeInvoiceV1,
  FeePaymentV1,
  FeeStructureV1,
  IncomeEntryV1,
  StudentFeeAssignmentV1
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');
const { User } = require('../../../models/admin/user');
const { ClassSection } = require('../../../models/admin/Classsection');
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

    const existingIncomeEntry = await IncomeEntryV1.findOne({
      where: { fee_payment_id: payment.id },
      transaction
    });

    if (!existingIncomeEntry) {
      const assignment = await StudentFeeAssignmentV1.findByPk(invoice.assignment_id, {
        attributes: ['id'],
        include: [{
          model: FeeStructureV1,
          as: 'feeStructure',
          attributes: ['academic_year_id']
        }],
        transaction
      });

      const academicYearId = assignment?.feeStructure?.academic_year_id || null;
      const totalCollected = Number(payment.amount_paid) + Number(payment.fine_paid || 0);

      await IncomeEntryV1.create({
        academic_year_id: academicYearId,
        fee_payment_id: payment.id,
        category: 'fee_collection',
        source: invoice.source_type || payment.payment_mode || null,
        amount: totalCollected,
        entry_date: payment.paid_at,
        notes: payment.notes || null,
        recorded_by: payment.collected_by
      }, { transaction });
    }

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
      include: [
        { model: FeeInvoiceV1, as: 'invoice', attributes: ['id', 'invoice_number', 'invoice_no'] },
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number', 'phone_no', 'class_section_id'],
          include: [
            { model: User, attributes: ['id', 'name', 'email'] },
            { model: ClassSection, attributes: ['id', 'class_name', 'section_name'] }
          ]
        }
      ]
    });

    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Payment not found' });
    const className = row.student?.ClassSection
      ? `${row.student.ClassSection.class_name}-${row.student.ClassSection.section_name}`
      : null;

    return ok(res, {
      payment: {
        id: row.id,
        payment_id: row.id,
        receipt_number: row.receipt_number,
        receipt_no: resolveReceiptNo(row),
        student_id: row.student_id,
        payment_date: row.paid_at,
        amount: Number(row.amount_paid),
        method: row.payment_mode,
        status: row.status,
        transaction_ref: row.transaction_ref || null,
        cheque_status: row.cheque_status || null,
        is_cancelled: row.is_cancelled
      },
      student: {
        id: row.student?.id || row.student_id,
        name: row.student?.User?.name || null,
        email: row.student?.User?.email || null,
        phone: row.student?.phone_no || null,
        roll_number: row.student?.roll_number || null,
        class_name: className
      },
      receipt: {
        receipt_number: row.receipt_number,
        receipt_no: resolveReceiptNo(row),
        invoice_id: row.invoice?.id || null,
        invoice_number: row.invoice?.invoice_number || null,
        invoice_no: resolveInvoiceNo(row.invoice),
        paid_at: row.paid_at
      }
    });
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

const listAllPayments = async (req, res) => {
  try {
    const { student_id, payment_mode, cheque_status, paid_from, paid_to, is_cancelled } = req.query;
    const where = {};

    if (student_id) where.student_id = Number(student_id);
    if (payment_mode) where.payment_mode = payment_mode;
    if (cheque_status) where.cheque_status = cheque_status;
    if (is_cancelled !== undefined) where.is_cancelled = is_cancelled === 'true';

    if (paid_from || paid_to) {
      where.paid_at = {};
      if (paid_from) where.paid_at[Op.gte] = new Date(paid_from);
      if (paid_to) where.paid_at[Op.lte] = new Date(paid_to);
    }

    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const { count, rows } = await FeePaymentV1.findAndCountAll({
      where,
      include: [{
        model: Student,
        as: 'student',
        attributes: ['id', 'roll_number', 'phone_no', 'class_section_id'],
        include: [
          { model: User, attributes: ['id', 'name', 'email'] },
          { model: ClassSection, attributes: ['id', 'class_name', 'section_name'] }
        ]
      }],
      order: [['paid_at', 'DESC']],
      limit,
      offset
    });

    const data = rows.map((row) => {
      const className = row.student?.ClassSection
        ? `${row.student.ClassSection.class_name}-${row.student.ClassSection.section_name}`
        : null;

      return {
        id: row.id,
        payment_id: row.id,
        receipt_number: row.receipt_number,
        receipt_no: resolveReceiptNo(row),
        student_id: row.student_id,
        student_name: row.student?.User?.name || null,
        class_name: className,
        payment_date: row.paid_at,
        amount: Number(row.amount_paid),
        method: row.payment_mode,
        status: row.status
      };
    });

    return ok(res, data, {
      total: count,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
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
  updateChequeStatus,
  listAllPayments
};

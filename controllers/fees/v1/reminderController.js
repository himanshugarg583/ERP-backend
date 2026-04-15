const { Op } = require('sequelize');
const { FeeInvoiceV1, FeeReminderV1 } = require('../../../models/admin/fees_v1');
const { Student } = require('../../../models/admin/Student');
const { User } = require('../../../models/admin/user');
const { sendEmail } = require('../../../services/fees/v1/mailerService');
const { ok, fail } = require('../../../utils/response');

const withinDndWindow = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 21 || hour < 8;
};

const buildDueReminderHtml = ({ studentName, invoiceNumber, amount }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
      <h2>Fee Due Reminder</h2>
      <p>Hello ${studentName},</p>
      <p>This is a reminder that invoice <strong>${invoiceNumber}</strong> has an outstanding amount of <strong>${amount}</strong>.</p>
      <p>Please clear dues to avoid restrictions on school services.</p>
      <p>Regards,<br/>School Accounts Team</p>
    </div>
  `;
};

const sendBulkReminder = async (req, res) => {
  try {
    if (withinDndWindow(new Date())) {
      return fail(res, {
        statusCode: 409,
        code: 'dnd_window',
        message: 'Reminders are blocked between 9 PM and 8 AM by policy.'
      });
    }

    const { academic_year_id } = req.body;

    const invoices = await FeeInvoiceV1.findAll({
      where: {
        academic_year_id,
        balance_amount: { [Op.gt]: 0 },
        status: { [Op.in]: ['active', 'partial', 'overdue'] }
      }
    });

    let sent = 0;
    let failed = 0;

    for (const invoice of invoices) {
      // eslint-disable-next-line no-await-in-loop
      const student = await Student.findByPk(invoice.student_id, { attributes: ['id', 'user_id'] });
      // eslint-disable-next-line no-await-in-loop
      const user = student?.user_id ? await User.findByPk(student.user_id, { attributes: ['email', 'name'] }) : null;

      const recipient = user?.email;
      const name = user?.name || 'Student';

      if (!recipient) {
        // eslint-disable-next-line no-await-in-loop
        await FeeReminderV1.create({
          invoice_id: invoice.id,
          student_id: invoice.student_id,
          recipient_number: 'missing-email',
          channel: 'email',
          reminder_type: 'overdue',
          message_template: 'bulk_due_reminder',
          status: 'failed',
          error_message: 'Student email is missing'
        });
        failed += 1;
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        await sendEmail({
          to: recipient,
          subject: `Fee Due Reminder - ${invoice.invoice_number}`,
          html: buildDueReminderHtml({
            studentName: name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.balance_amount
          }),
          text: `Due reminder for ${invoice.invoice_number}. Outstanding: ${invoice.balance_amount}`
        });

        // eslint-disable-next-line no-await-in-loop
        await FeeReminderV1.create({
          invoice_id: invoice.id,
          student_id: invoice.student_id,
          recipient_number: recipient,
          channel: 'email',
          reminder_type: 'overdue',
          message_template: 'bulk_due_reminder',
          status: 'sent'
        });

        sent += 1;
      } catch (error) {
        // eslint-disable-next-line no-await-in-loop
        await FeeReminderV1.create({
          invoice_id: invoice.id,
          student_id: invoice.student_id,
          recipient_number: recipient,
          channel: 'email',
          reminder_type: 'overdue',
          message_template: 'bulk_due_reminder',
          status: 'failed',
          error_message: error.message
        });

        failed += 1;
      }
    }

    return ok(res, { sent, failed, total: invoices.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'bulk_reminder_failed', message: error.message });
  }
};

module.exports = {
  sendBulkReminder
};

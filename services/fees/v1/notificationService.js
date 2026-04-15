const { FeeReminderV1 } = require('../../../models/admin/fees_v1');
const { Student } = require('../../../models/admin/Student');
const { User } = require('../../../models/admin/user');
const { sendEmail } = require('./mailerService');

const buildReceiptHtml = ({ studentName, receiptNumber, amount, fine, mode, invoiceNumber }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
      <h2>Fee Receipt</h2>
      <p>Hello ${studentName},</p>
      <p>Your fee payment has been received successfully.</p>
      <ul>
        <li>Receipt Number: <strong>${receiptNumber}</strong></li>
        <li>Invoice Number: <strong>${invoiceNumber}</strong></li>
        <li>Amount Paid: <strong>${amount}</strong></li>
        <li>Fine Paid: <strong>${fine}</strong></li>
        <li>Mode: <strong>${mode}</strong></li>
      </ul>
      <p>Regards,<br/>School Accounts Team</p>
    </div>
  `;
};

const sendReceiptEmailAndLog = async ({ invoiceId, studentId, receiptNumber, amount, fine, mode, invoiceNumber }) => {
  const student = await Student.findByPk(studentId, { attributes: ['id', 'user_id'] });
  const user = student?.user_id ? await User.findByPk(student.user_id, { attributes: ['email', 'name'] }) : null;

  const recipientEmail = user?.email;
  const studentName = user?.name || 'Student';

  if (!recipientEmail) {
    await FeeReminderV1.create({
      invoice_id: invoiceId,
      student_id: studentId,
      recipient_number: 'missing-email',
      channel: 'email',
      reminder_type: 'receipt',
      message_template: 'payment_receipt',
      status: 'failed',
      error_message: 'Student email is missing'
    });
    return;
  }

  try {
    await sendEmail({
      to: recipientEmail,
      subject: `Fee Receipt ${receiptNumber}`,
      html: buildReceiptHtml({ studentName, receiptNumber, amount, fine, mode, invoiceNumber }),
      text: `Receipt ${receiptNumber} | Invoice ${invoiceNumber} | Amount ${amount} | Fine ${fine}`
    });

    await FeeReminderV1.create({
      invoice_id: invoiceId,
      student_id: studentId,
      recipient_number: recipientEmail,
      channel: 'email',
      reminder_type: 'receipt',
      message_template: 'payment_receipt',
      status: 'sent'
    });
  } catch (error) {
    await FeeReminderV1.create({
      invoice_id: invoiceId,
      student_id: studentId,
      recipient_number: recipientEmail,
      channel: 'email',
      reminder_type: 'receipt',
      message_template: 'payment_receipt',
      status: 'failed',
      error_message: error.message
    });
  }
};

module.exports = {
  sendReceiptEmailAndLog
};
